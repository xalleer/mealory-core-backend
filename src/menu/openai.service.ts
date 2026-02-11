import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { GoalType } from '../auth/auth.types';
import type { MeasurementUnitType } from '../products/products.types';
import type { MealTypeType } from './menu.types';

export type OpenAiMemberProfile = {
  id: string;
  name: string;
  mealTimes: unknown;
  allergies: unknown;
  goal: GoalType | null;
};

export type OpenAiProduct = {
  id: string;
  name: string;
  nameEn: string | null;
  category: string;
  averagePrice: number;
  baseUnit: MeasurementUnitType;
  calories: number | null;
  protein: number | null;
  fats: number | null;
  carbs: number | null;
  allergens: unknown;
};

export type OpenAiRecipeIngredient = {
  productId: string;
  quantity: number;
  unit: MeasurementUnitType;
};

export type OpenAiRecipe = {
  name: string;
  nameEn: string | null;
  description: string | null;
  cookingTime: number | null;
  servings: number;
  calories: number | null;
  protein: number | null;
  fats: number | null;
  carbs: number | null;
  instructions: unknown;
  imageUrl: string | null;
  ingredients: OpenAiRecipeIngredient[];
};

export type OpenAiMeal = {
  familyMemberId: string | null;
  mealType: MealTypeType;
  recipe: OpenAiRecipe | null;
};

export type OpenAiMenuDay = {
  dayNumber: number;
  meals: OpenAiMeal[];
};

export type OpenAiMenuResponse = {
  menu: {
    days: OpenAiMenuDay[];
  };
};

export type OpenAiDayResponse = {
  day: {
    meals: OpenAiMeal[];
  };
};

export type OpenAiMealResponse = {
  meal: {
    recipe: OpenAiRecipe | null;
  };
};

@Injectable()
export class OpenAiService {
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.apiKey = apiKey;
  }

  async generateMenu(params: {
    weekStart: Date;
    weekEnd: Date;
    weeklyBudget: number | null;
    regenerationReason?: string;
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }): Promise<OpenAiMenuResponse> {
    const prompt = this.buildMenuPrompt({
      ...params,
      regenerationReason: params.regenerationReason ?? null,
    });
    return this.requestJson<OpenAiMenuResponse>(prompt);
  }

  async regenerateDay(params: {
    dayNumber: number;
    date: Date;
    weeklyBudget: number | null;
    reason: string;
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }): Promise<OpenAiDayResponse> {
    const prompt = this.buildDayPrompt(params);
    return this.requestJson<OpenAiDayResponse>(prompt);
  }

  async regenerateMeal(params: {
    dayNumber: number;
    date: Date;
    mealType: MealTypeType;
    familyMemberId: string | null;
    weeklyBudget: number | null;
    reason: string;
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }): Promise<OpenAiMealResponse> {
    const prompt = this.buildMealPrompt(params);
    return this.requestJson<OpenAiMealResponse>(prompt);
  }

  private async requestJson<T>(prompt: string): Promise<T> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a menu generation engine. Return only valid JSON with no markdown.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `OpenAI API error: ${response.status} ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };

    if (payload.error?.message) {
      throw new InternalServerErrorException(payload.error.message);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new BadRequestException('OpenAI returned empty response');
    }

    try {
      return JSON.parse(content) as T;
    } catch {
      throw new BadRequestException('OpenAI returned invalid JSON');
    }
  }

  private buildMenuPrompt(params: {
    weekStart: Date;
    weekEnd: Date;
    weeklyBudget: number | null;
    regenerationReason: string | null;
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }) {
    const budgetText =
      params.weeklyBudget && params.weeklyBudget > 0
        ? `Weekly budget limit: ${params.weeklyBudget}`
        : 'Weekly budget: unlimited';

    return [
      'Generate a 7-day menu for the family using ONLY the provided products list.',
      'If members have different goals, provide tailored meals per member.',
      'Return exactly 7 days (dayNumber 1-7).',
      'Each day must include meals for each family member and each meal type they should eat.',
      'Use productId from the product list. Do not invent products.',
      `${budgetText}.`,
      params.regenerationReason
        ? `Regeneration reason: ${params.regenerationReason}.`
        : null,
      'Output JSON in this schema:',
      '{"menu":{"days":[{"dayNumber":1,"meals":[{"familyMemberId":"uuid","mealType":"breakfast","recipe":{"name":"","nameEn":null,"description":null,"cookingTime":30,"servings":1,"calories":300,"protein":20,"fats":10,"carbs":40,"instructions":[],"imageUrl":null,"ingredients":[{"productId":"uuid","quantity":100,"unit":"g"}]}}]}]}}',
      `Week start: ${params.weekStart.toISOString().slice(0, 10)}; Week end: ${params.weekEnd.toISOString().slice(0, 10)}.`,
      `Family members JSON: ${JSON.stringify(params.members)}.`,
      `Products JSON: ${JSON.stringify(params.products)}.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildDayPrompt(params: {
    dayNumber: number;
    date: Date;
    weeklyBudget: number | null;
    reason: string;
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }) {
    const budgetText =
      params.weeklyBudget && params.weeklyBudget > 0
        ? `Weekly budget limit: ${params.weeklyBudget}`
        : 'Weekly budget: unlimited';

    return [
      'Regenerate menu for a single day using ONLY provided products.',
      'Return meals for the day for each family member and meal type.',
      'Use productId from the product list. Do not invent products.',
      `${budgetText}.`,
      `Reason: ${params.reason}.`,
      `Day number: ${params.dayNumber}. Date: ${params.date.toISOString().slice(0, 10)}.`,
      'Output JSON in this schema:',
      '{"day":{"meals":[{"familyMemberId":"uuid","mealType":"breakfast","recipe":{"name":"","nameEn":null,"description":null,"cookingTime":30,"servings":1,"calories":300,"protein":20,"fats":10,"carbs":40,"instructions":[],"imageUrl":null,"ingredients":[{"productId":"uuid","quantity":100,"unit":"g"}]}}]}}',
      `Family members JSON: ${JSON.stringify(params.members)}.`,
      `Products JSON: ${JSON.stringify(params.products)}.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildMealPrompt(params: {
    dayNumber: number;
    date: Date;
    mealType: MealTypeType;
    familyMemberId: string | null;
    weeklyBudget: number | null;
    reason: string;
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }) {
    const budgetText =
      params.weeklyBudget && params.weeklyBudget > 0
        ? `Weekly budget limit: ${params.weeklyBudget}`
        : 'Weekly budget: unlimited';

    return [
      'Regenerate a single meal recipe using ONLY provided products.',
      'Return only the recipe object for the meal type and member.',
      'Use productId from the product list. Do not invent products.',
      `${budgetText}.`,
      `Reason: ${params.reason}.`,
      `Day number: ${params.dayNumber}. Date: ${params.date.toISOString().slice(0, 10)}.`,
      `Meal type: ${params.mealType}. Family member: ${params.familyMemberId ?? 'null'}.`,
      'Output JSON in this schema:',
      '{"meal":{"recipe":{"name":"","nameEn":null,"description":null,"cookingTime":30,"servings":1,"calories":300,"protein":20,"fats":10,"carbs":40,"instructions":[],"imageUrl":null,"ingredients":[{"productId":"uuid","quantity":100,"unit":"g"}]}}}',
      `Family members JSON: ${JSON.stringify(params.members)}.`,
      `Products JSON: ${JSON.stringify(params.products)}.`,
    ]
      .filter(Boolean)
      .join('\n');
  }
}
