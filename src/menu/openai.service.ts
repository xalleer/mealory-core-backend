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
  isRegistered: boolean;
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
  standardPackaging: number | null;
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

    const expectedMealsPerMember = params.members
      .map(member => {
        const mealTimes = Array.isArray(member.mealTimes)
          ? (member.mealTimes as unknown[])
          : [];
        const normalizedMealTypes = mealTimes.filter((t): t is MealTypeType =>
          ['breakfast', 'lunch', 'snack', 'dinner'].includes(
            String(t).toLowerCase(),
          ),
        );
        const requiredMealTypes: MealTypeType[] =
          normalizedMealTypes.length > 0
            ? normalizedMealTypes
            : member.isRegistered
              ? ['breakfast', 'lunch', 'snack', 'dinner']
              : [];

        return {
          familyMemberId: member.id,
          isRegistered: member.isRegistered,
          requiredMealTypes,
        };
      })
      .filter(m => m.requiredMealTypes.length > 0);

    return [
      'Ти — двигун генерації меню. Поверни тільки валідний JSON без markdown.',
      'Згенеруй меню на 7 днів для сім’ї, використовуючи ТІЛЬКИ список наданих продуктів.',
      'Всі користувацькі тексти мають бути українською: назви рецептів, описи, кроки приготування.',
      'Якщо у члена сім’ї є goal (зазвичай це зареєстрований користувач), адаптуй рецепти під цю ціль.',
      'Поверни рівно 7 днів (dayNumber 1-7).',
      'Кожен день має містити meals для кожного члена сім’ї згідно його mealTimes.',
      'Правило для mealTimes:',
      '- Якщо mealTimes — непорожній масив, згенеруй рівно ці mealType для цього familyMemberId.',
      '- Якщо isRegistered=true і mealTimes відсутній/порожній, згенеруй 4 mealType: breakfast, lunch, snack, dinner.',
      '- Якщо isRegistered=false і mealTimes відсутній/порожній, НЕ генеруй meals для цього familyMemberId.',
      'ОБОВ’ЯЗКОВО: не пропускай жодного required mealType. Якщо для required mealType важко підібрати рецепт, все одно поверни meal з recipe, який використовує доступні продукти і вкладається в бюджет.',
      `Expected meals per member: ${JSON.stringify(expectedMealsPerMember)}.`,
      'Для кожного meal заповнюй recipe (не null).',
      'Використовуй тільки productId зі списку продуктів. Не вигадуй нових продуктів.',
      'ЗАБОРОНЕНО використовувати або згадувати будь-які інгредієнти/продукти тощо, якщо їх немає в Products JSON.',
      'Всі інгредієнти, які згадані в name/description/instructions, ОБОВ’ЯЗКОВО мають бути присутні в ingredients[]. Не згадуй інгредієнти, яких немає в ingredients[].',
      'Поле instructions ОБОВ’ЯЗКОВЕ: масив рядків (кроки), мінімум 3 кроки, не порожній.',
      'БЮДЖЕТ ОБОВ’ЯЗКОВИЙ: якщо Weekly budget limit заданий (не unlimited), меню має вкладатися в бюджет.',
      'Ціноутворення продуктів:',
      '- averagePrice — це ціна за СТАНДАРТНУ упаковку продукту.',
      '- standardPackaging — розмір стандартної упаковки в baseUnit (наприклад 1000 g, 1 l, 10 pcs). Може бути null.',
      'Як оцінювати вартість інгредієнтів для бюджету:',
      '- Для кожного productId сумуй загальну кількість (quantity) по всьому меню.',
      '- Якщо standardPackaging відомий і > 0: packagesNeeded = ceil(totalQuantity / standardPackaging). cost = packagesNeeded * averagePrice.',
      '- Якщо standardPackaging відсутній/null: вважай 1 упаковку на кожен унікальний productId, який використовується в меню. cost += averagePrice.',
      'Підбери рецепти і кількості так, щоб сумарна оцінка cost не перевищувала weeklyBudget.',
      `${budgetText}.`,
      params.regenerationReason
        ? `Regeneration reason: ${params.regenerationReason}.`
        : null,
      'Поверни JSON за схемою (приклад):',
      '{"menu":{"days":[{"dayNumber":1,"meals":[{"familyMemberId":"uuid","mealType":"breakfast","recipe":{"name":"","nameEn":null,"description":null,"cookingTime":30,"servings":1,"calories":300,"protein":20,"fats":10,"carbs":40,"instructions":["Крок 1","Крок 2","Крок 3"],"imageUrl":null,"ingredients":[{"productId":"uuid","quantity":100,"unit":"g"}]}}]}]}}',
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

    const expectedMealsPerMember = params.members
      .map(member => {
        const mealTimes = Array.isArray(member.mealTimes)
          ? (member.mealTimes as unknown[])
          : [];
        const normalizedMealTypes = mealTimes.filter((t): t is MealTypeType =>
          ['breakfast', 'lunch', 'snack', 'dinner'].includes(
            String(t).toLowerCase(),
          ),
        );
        const requiredMealTypes: MealTypeType[] =
          normalizedMealTypes.length > 0
            ? normalizedMealTypes
            : member.isRegistered
              ? ['breakfast', 'lunch', 'snack', 'dinner']
              : [];

        return {
          familyMemberId: member.id,
          isRegistered: member.isRegistered,
          requiredMealTypes,
        };
      })
      .filter(m => m.requiredMealTypes.length > 0);

    return [
      'Ти — двигун генерації меню. Поверни тільки валідний JSON без markdown.',
      'Перегенеруй меню для ОДНОГО дня, використовуючи ТІЛЬКИ надані продукти.',
      'Всі користувацькі тексти мають бути українською: назви рецептів, описи, кроки приготування.',
      'Поверни страви на день для КОЖНОГО члена сім’ї згідно його mealTimes (див. правило нижче).',
      'Правило для mealTimes:',
      '- Якщо mealTimes — непорожній масив, згенеруй рівно ці mealType для цього familyMemberId.',
      '- Якщо isRegistered=true і mealTimes відсутній/порожній, згенеруй 4 mealType: breakfast, lunch, snack, dinner.',
      '- Якщо isRegistered=false і mealTimes відсутній/порожній, НЕ генеруй meals для цього familyMemberId.',
      'ОБОВ’ЯЗКОВО: не пропускай жодного required mealType.',
      `Expected meals per member: ${JSON.stringify(expectedMealsPerMember)}.`,
      'Для кожного meal заповнюй recipe (не null).',
      'Використовуй тільки productId зі списку продуктів. Не вигадуй нових продуктів.',
      'ЗАБОРОНЕНО використовувати або згадувати будь-які інгредієнти/продукти тощо, якщо їх немає в Products JSON.',
      'Всі інгредієнти, які згадані в name/description/instructions, ОБОВ’ЯЗКОВО мають бути присутні в ingredients[]. Не згадуй інгредієнти, яких немає в ingredients[].',
      'Поле instructions ОБОВ’ЯЗКОВЕ: масив рядків (кроки), мінімум 3 кроки, не порожній.',
      'БЮДЖЕТ ОБОВ’ЯЗКОВИЙ: якщо Weekly budget limit заданий (не unlimited), підбирай рецепти/порції так, щоб не перевищити бюджет (ціна за стандартну упаковку).',
      `${budgetText}.`,
      `Reason: ${params.reason}.`,
      `Day number: ${params.dayNumber}. Date: ${params.date.toISOString().slice(0, 10)}.`,
      'Поверни JSON за схемою (приклад):',
      '{"day":{"meals":[{"familyMemberId":"uuid","mealType":"breakfast","recipe":{"name":"","nameEn":null,"description":null,"cookingTime":30,"servings":1,"calories":300,"protein":20,"fats":10,"carbs":40,"instructions":["Крок 1","Крок 2","Крок 3"],"imageUrl":null,"ingredients":[{"productId":"uuid","quantity":100,"unit":"g"}]}}]}}',
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
      'Ти — двигун генерації рецептів. Поверни тільки валідний JSON без markdown.',
      'Перегенеруй ОДИН рецепт для конкретного прийому їжі, використовуючи ТІЛЬКИ надані продукти.',
      'Всі користувацькі тексти мають бути українською: назва, опис, кроки приготування.',
      'Поле instructions ОБОВ’ЯЗКОВЕ: масив рядків (кроки), мінімум 3 кроки, не порожній.',
      'Використовуй тільки productId зі списку продуктів. Не вигадуй нових продуктів.',
      'ЗАБОРОНЕНО використовувати або згадувати будь-які інгредієнти/продукти тощо, якщо їх немає в Products JSON.',
      'Всі інгредієнти, які згадані в name/description/instructions, ОБОВ’ЯЗКОВО мають бути присутні в ingredients[]. Не згадуй інгредієнти, яких немає в ingredients[].',
      `${budgetText}.`,
      `Reason: ${params.reason}.`,
      `Day number: ${params.dayNumber}. Date: ${params.date.toISOString().slice(0, 10)}.`,
      `Meal type: ${params.mealType}. Family member: ${params.familyMemberId ?? 'null'}.`,
      'Поверни JSON за схемою (приклад):',
      '{"meal":{"recipe":{"name":"","nameEn":null,"description":null,"cookingTime":30,"servings":1,"calories":300,"protein":20,"fats":10,"carbs":40,"instructions":["Крок 1","Крок 2","Крок 3"],"imageUrl":null,"ingredients":[{"productId":"uuid","quantity":100,"unit":"g"}]}}}',
      `Family members JSON: ${JSON.stringify(params.members)}.`,
      `Products JSON: ${JSON.stringify(params.products)}.`,
    ]
      .filter(Boolean)
      .join('\n');
  }
}
