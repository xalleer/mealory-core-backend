import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { GenerateMenuDto } from './dto/generate-menu.dto';
import type { RegenerateMenuDto } from './dto/regenerate-menu.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ShoppingListService } from '../shopping-list/shopping-list.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  OpenAiService,
  type OpenAiMeal,
  type OpenAiMenuDay,
  type OpenAiMenuResponse,
  type OpenAiMemberProfile,
  type OpenAiProduct,
  type OpenAiRecipe,
} from './openai.service';
import {
  MEAL_STATUS_VALUES,
  MEAL_TYPE_VALUES,
  type MealStatusType,
  type MealTypeType,
} from './menu.types';

const MEAL_SCHEDULE: Record<MealTypeType, { hours: number; minutes: number }> =
  {
    breakfast: { hours: 8, minutes: 0 },
    lunch: { hours: 13, minutes: 0 },
    snack: { hours: 16, minutes: 0 },
    dinner: { hours: 19, minutes: 0 },
  };

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
    private readonly shoppingListService: ShoppingListService,
    private readonly inventoryService: InventoryService,
  ) {}

  async generateMenu(userId: string, dto: GenerateMenuDto) {
    const userFamilyId = await this.getUserFamilyId(userId);
    if (userFamilyId !== dto.familyId) {
      throw new ForbiddenException('User is not in this family');
    }

    const family = await this.getFamily(dto.familyId);
    const { weekStart, weekEnd } = this.getCurrentWeekPeriod();
    const { members, products } = await this.getOpenAiContext(family);

    const menuParams: {
      weekStart: Date;
      weekEnd: Date;
      weeklyBudget: number | null;
      members: OpenAiMemberProfile[];
      products: OpenAiProduct[];
      regenerationReason?: string;
    } = {
      weekStart,
      weekEnd,
      weeklyBudget: family.weeklyBudget,
      members,
      products,
    };

    if (dto.regenerationReason !== undefined) {
      menuParams.regenerationReason = dto.regenerationReason;
    }

    const aiResponse = await this.openAiService.generateMenu(menuParams);

    const createData = this.buildMenuCreateData({
      familyId: family.id,
      weekStart,
      weekEnd,
      menuResponse: aiResponse,
      members,
      products,
    });

    const menu = await this.prisma.$transaction(async tx => {
      await tx.menu.updateMany({
        where: { familyId: family.id, isActive: true },
        data: { isActive: false },
      });

      return tx.menu.create({
        data: createData,
        include: this.menuInclude,
      });
    });

    await this.shoppingListService.generateFromMenu(userId, menu.id);

    return menu;
  }

  async regenerateMenu(userId: string, menuId: string, dto: RegenerateMenuDto) {
    const userFamilyId = await this.getUserFamilyId(userId);
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }
    if (menu.familyId !== userFamilyId) {
      throw new ForbiddenException('User is not in this family');
    }

    const family = await this.getFamily(menu.familyId);
    const { members, products } = await this.getOpenAiContext(family);

    const aiResponse = await this.openAiService.generateMenu({
      weekStart: menu.weekStart,
      weekEnd: menu.weekEnd,
      weeklyBudget: family.weeklyBudget,
      regenerationReason: dto.reason,
      members,
      products,
    });

    const daysData = this.buildDaysCreateData({
      weekStart: menu.weekStart,
      menuResponse: aiResponse,
      members,
      products,
    });

    return this.prisma.menu.update({
      where: { id: menu.id },
      data: {
        days: {
          deleteMany: {},
          create: daysData,
        },
      },
      include: this.menuInclude,
    });
  }

  async regenerateDay(userId: string, dayId: string, dto: RegenerateMenuDto) {
    const userFamilyId = await this.getUserFamilyId(userId);
    const day = await this.prisma.day.findUnique({
      where: { id: dayId },
      include: { menu: true },
    });
    if (!day) {
      throw new NotFoundException('Day not found');
    }
    if (day.menu.familyId !== userFamilyId) {
      throw new ForbiddenException('User is not in this family');
    }

    const family = await this.getFamily(day.menu.familyId);
    const { members, products } = await this.getOpenAiContext(family);

    const aiResponse = await this.openAiService.regenerateDay({
      dayNumber: day.dayNumber,
      date: day.date,
      weeklyBudget: family.weeklyBudget,
      reason: dto.reason,
      members,
      products,
    });

    const mealsData = this.buildMealsCreateData({
      dayDate: day.date,
      meals: aiResponse.day.meals,
      members,
      products,
    });

    await this.prisma.day.update({
      where: { id: day.id },
      data: {
        meals: {
          deleteMany: {},
          create: mealsData,
        },
      },
    });

    return this.getMenuById(day.menuId);
  }

  async regenerateMeal(userId: string, mealId: string, dto: RegenerateMenuDto) {
    const userFamilyId = await this.getUserFamilyId(userId);
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        recipe: true,
        day: { include: { menu: true } },
      },
    });
    if (!meal) {
      throw new NotFoundException('Meal not found');
    }
    if (meal.day.menu.familyId !== userFamilyId) {
      throw new ForbiddenException('User is not in this family');
    }

    const family = await this.getFamily(meal.day.menu.familyId);
    const { members, products } = await this.getOpenAiContext(family);

    const aiResponse = await this.openAiService.regenerateMeal({
      dayNumber: meal.day.dayNumber,
      date: meal.day.date,
      mealType: meal.mealType,
      familyMemberId: meal.familyMemberId,
      weeklyBudget: family.weeklyBudget,
      reason: dto.reason,
      members,
      products,
    });

    if (!aiResponse.meal.recipe) {
      if (meal.recipe) {
        await this.prisma.meal.update({
          where: { id: meal.id },
          data: { recipe: { delete: true } },
        });
      }
      return this.getMenuById(meal.day.menu.id);
    }

    const recipeCreate = this.buildRecipeCreateData(
      aiResponse.meal.recipe,
      new Set(products.map(product => product.id)),
    );
    const recipeUpdate = this.buildRecipeUpdateData(
      aiResponse.meal.recipe,
      new Set(products.map(product => product.id)),
    );

    await this.prisma.meal.update({
      where: { id: meal.id },
      data: {
        recipe: {
          upsert: {
            create: recipeCreate,
            update: recipeUpdate,
          },
        },
      },
    });

    return this.getMenuById(meal.day.menu.id);
  }

  async getCurrentMenu(userId: string) {
    const familyId = await this.getUserFamilyId(userId);
    const menu = await this.prisma.menu.findFirst({
      where: { familyId, isActive: true },
      include: this.menuInclude,
      orderBy: { createdAt: 'desc' },
    });

    if (!menu) {
      throw new NotFoundException('Active menu not found');
    }

    return menu;
  }

  async updateMealStatus(
    userId: string,
    mealId: string,
    status: MealStatusType,
  ) {
    const familyId = await this.getUserFamilyId(userId);
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        day: { include: { menu: true } },
        recipe: { include: { ingredients: true } },
      },
    });
    if (!meal) {
      throw new NotFoundException('Meal not found');
    }
    if (meal.day.menu.familyId !== familyId) {
      throw new ForbiddenException('User is not in this family');
    }

    if (!MEAL_STATUS_VALUES.includes(status)) {
      throw new BadRequestException('Invalid meal status');
    }

    if (status === 'completed' && meal.status !== 'completed') {
      const ingredients = meal.recipe?.ingredients ?? [];

      if (ingredients.length > 0) {
        try {
          await this.inventoryService.deductIngredients(
            familyId,
            ingredients.map(ing => ({
              productId: ing.productId,
              quantity: ing.quantity.toNumber(),
              unit: ing.unit,
            })),
          );
        } catch (error) {
          if (error instanceof BadRequestException) {
            const response = error.getResponse();
            const message =
              typeof response === 'string'
                ? response
                : (response as { message?: unknown }).message;

            if (message === 'Not enough inventory to deduct ingredients') {
              throw new BadRequestException(
                'Not enough ingredients in inventory. Please add products first.',
              );
            }

            throw error;
          }

          throw error;
        }
      }
    }

    const completedAt =
      status === 'completed'
        ? meal.status === 'completed'
          ? meal.completedAt
          : new Date()
        : null;

    return this.prisma.meal.update({
      where: { id: meal.id },
      data: { status, completedAt },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: { product: true },
            },
          },
        },
      },
    });
  }

  private async getMenuById(menuId: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id: menuId },
      include: this.menuInclude,
    });
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }
    return menu;
  }

  private async getUserFamilyId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    if (!user.familyId) {
      throw new ForbiddenException('User has no family');
    }
    return user.familyId;
  }

  private async getFamily(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          include: {
            user: {
              select: { goal: true },
            },
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    return {
      ...family,
      weeklyBudget:
        family.weeklyBudget != null ? family.weeklyBudget.toNumber() : null,
    };
  }

  private async getOpenAiContext(family: {
    members: Array<{
      id: string;
      name: string;
      isRegistered: boolean;
      mealTimes: unknown;
      allergies: unknown;
      user: { goal: string | null } | null;
    }>;
  }) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
    });

    const mappedProducts: OpenAiProduct[] = products.map(product => ({
      id: product.id,
      name: product.name,
      nameEn: product.nameEn ?? null,
      category: product.category,
      averagePrice: product.averagePrice.toNumber(),
      baseUnit: product.baseUnit,
      standardPackaging:
        product.standardPackaging != null
          ? product.standardPackaging.toNumber()
          : null,
      calories: product.calories ?? null,
      protein: product.protein ? product.protein.toNumber() : null,
      fats: product.fats ? product.fats.toNumber() : null,
      carbs: product.carbs ? product.carbs.toNumber() : null,
      allergens: product.allergens,
    }));

    const members: OpenAiMemberProfile[] = family.members.map(member => ({
      id: member.id,
      name: member.name,
      isRegistered: member.isRegistered,
      mealTimes: member.mealTimes,
      allergies: member.allergies,
      goal: (member.user?.goal as OpenAiMemberProfile['goal']) ?? null,
    }));

    return { members, products: mappedProducts };
  }

  private buildMenuCreateData(params: {
    familyId: string;
    weekStart: Date;
    weekEnd: Date;
    menuResponse: OpenAiMenuResponse;
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }): Prisma.MenuCreateInput {
    return {
      family: {
        connect: {
          id: params.familyId,
        },
      },
      weekStart: params.weekStart,
      weekEnd: params.weekEnd,
      isActive: true,
      days: {
        create: this.buildDaysCreateData(params),
      },
    };
  }

  private buildDaysCreateData(params: {
    weekStart: Date;
    menuResponse: OpenAiMenuResponse;
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }) {
    const days = params.menuResponse.menu?.days;
    if (!days || !Array.isArray(days)) {
      throw new BadRequestException('OpenAI response missing days');
    }
    if (days.length !== 7) {
      throw new BadRequestException('OpenAI must return 7 days');
    }

    return days.map(day =>
      this.buildDayCreateData({
        weekStart: params.weekStart,
        day,
        members: params.members,
        products: params.products,
      }),
    );
  }

  private buildDayCreateData(params: {
    weekStart: Date;
    day: OpenAiMenuDay;
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }) {
    if (params.day.dayNumber < 1 || params.day.dayNumber > 7) {
      throw new BadRequestException('Invalid day number');
    }

    const dayDate = this.getDayDate(params.weekStart, params.day.dayNumber);

    this.validateDayMeals(params.day.meals, params.members);

    return {
      dayNumber: params.day.dayNumber,
      date: dayDate,
      meals: {
        create: this.buildMealsCreateData({
          dayDate,
          meals: params.day.meals,
          members: params.members,
          products: params.products,
        }),
      },
    };
  }

  private buildMealsCreateData(params: {
    dayDate: Date;
    meals: OpenAiMeal[];
    members: OpenAiMemberProfile[];
    products: OpenAiProduct[];
  }) {
    if (!Array.isArray(params.meals)) {
      throw new BadRequestException('OpenAI response missing meals');
    }

    const memberIds = new Set(params.members.map(member => member.id));
    const productIds = new Set(params.products.map(product => product.id));

    return params.meals.map(meal => {
      if (!MEAL_TYPE_VALUES.includes(meal.mealType)) {
        throw new BadRequestException('Invalid meal type from OpenAI');
      }

      if (meal.familyMemberId && !memberIds.has(meal.familyMemberId)) {
        throw new BadRequestException('Invalid family member in OpenAI');
      }

      const mealData: Prisma.MealUncheckedCreateWithoutDayInput = {
        familyMemberId: meal.familyMemberId,
        mealType: meal.mealType,
        scheduledTime: this.getScheduledTime(params.dayDate, meal.mealType),
      };

      if (meal.recipe) {
        this.validateRecipeInstructions(meal.recipe.instructions);
        mealData.recipe = {
          create: this.buildRecipeCreateData(meal.recipe, productIds),
        };
      }

      return mealData;
    });
  }

  private buildRecipeCreateData(
    recipe: OpenAiRecipe,
    productIds: Set<string>,
  ): Prisma.RecipeCreateWithoutMealInput {
    this.validateRecipeIngredients(recipe, productIds);

    return {
      name: recipe.name,
      nameEn: recipe.nameEn ?? null,
      description: recipe.description ?? null,
      cookingTime: recipe.cookingTime ?? null,
      servings: recipe.servings,
      calories: recipe.calories ?? null,
      protein:
        recipe.protein != null ? new Prisma.Decimal(recipe.protein) : null,
      fats: recipe.fats != null ? new Prisma.Decimal(recipe.fats) : null,
      carbs: recipe.carbs != null ? new Prisma.Decimal(recipe.carbs) : null,
      instructions: recipe.instructions as Prisma.InputJsonValue,
      imageUrl: recipe.imageUrl ?? null,
      ingredients: {
        create: recipe.ingredients.map(ingredient => ({
          productId: ingredient.productId,
          quantity: new Prisma.Decimal(ingredient.quantity),
          unit: ingredient.unit,
        })),
      },
    };
  }

  private buildRecipeUpdateData(
    recipe: OpenAiRecipe,
    productIds: Set<string>,
  ): Prisma.RecipeUpdateWithoutMealInput {
    this.validateRecipeIngredients(recipe, productIds);

    return {
      name: recipe.name,
      nameEn: recipe.nameEn ?? null,
      description: recipe.description ?? null,
      cookingTime: recipe.cookingTime ?? null,
      servings: recipe.servings,
      calories: recipe.calories ?? null,
      protein:
        recipe.protein != null ? new Prisma.Decimal(recipe.protein) : null,
      fats: recipe.fats != null ? new Prisma.Decimal(recipe.fats) : null,
      carbs: recipe.carbs != null ? new Prisma.Decimal(recipe.carbs) : null,
      instructions: recipe.instructions as Prisma.InputJsonValue,
      imageUrl: recipe.imageUrl ?? null,
      ingredients: {
        deleteMany: {},
        create: recipe.ingredients.map(ingredient => ({
          productId: ingredient.productId,
          quantity: new Prisma.Decimal(ingredient.quantity),
          unit: ingredient.unit,
        })),
      },
    };
  }

  private validateRecipeIngredients(
    recipe: OpenAiRecipe,
    productIds: Set<string>,
  ) {
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      throw new BadRequestException('Recipe ingredients missing');
    }

    for (const ingredient of recipe.ingredients) {
      if (!productIds.has(ingredient.productId)) {
        throw new BadRequestException('Invalid product in recipe');
      }
    }
  }

  private validateDayMeals(
    meals: OpenAiMeal[] | unknown,
    members: OpenAiMemberProfile[],
  ) {
    if (!Array.isArray(meals)) {
      throw new BadRequestException('OpenAI response missing meals');
    }

    const expected: Array<{ familyMemberId: string; mealType: MealTypeType }> =
      [];

    for (const member of members) {
      const mealTimes = Array.isArray(member.mealTimes)
        ? (member.mealTimes as unknown[])
        : [];
      const normalizedMealTypes = mealTimes.filter((t): t is MealTypeType =>
        MEAL_TYPE_VALUES.includes(t as MealTypeType),
      );

      const requiredMealTypes: MealTypeType[] =
        normalizedMealTypes.length > 0
          ? normalizedMealTypes
          : member.isRegistered
            ? [...MEAL_TYPE_VALUES]
            : [];

      for (const mealType of requiredMealTypes) {
        expected.push({ familyMemberId: member.id, mealType });
      }
    }

    for (const item of expected) {
      const hasMeal = meals.some(
        m => m.familyMemberId === item.familyMemberId && m.mealType === item.mealType,
      );
      if (!hasMeal) {
        throw new BadRequestException(
          `OpenAI response missing meal: member=${item.familyMemberId} mealType=${item.mealType}`,
        );
      }
    }

    if (meals.length !== expected.length) {
      throw new BadRequestException(
        `OpenAI must return exactly ${expected.length} meals per day (got ${meals.length})`,
      );
    }
  }

  private validateRecipeInstructions(instructions: unknown) {
    if (!Array.isArray(instructions)) {
      throw new BadRequestException('Recipe instructions must be an array');
    }

    const steps = instructions.filter(
      step => typeof step === 'string' && step.trim().length > 0,
    );

    if (steps.length < 3) {
      throw new BadRequestException('Recipe instructions must have at least 3 steps');
    }
  }

  private getDayDate(weekStart: Date, dayNumber: number) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + (dayNumber - 1));
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getScheduledTime(date: Date, mealType: MealTypeType) {
    const scheduled = new Date(date);
    const schedule = MEAL_SCHEDULE[mealType];
    scheduled.setHours(schedule.hours, schedule.minutes, 0, 0);
    return scheduled;
  }

  private getCurrentWeekPeriod() {
    const now = new Date();
    const day = now.getDay();
    const daysFromMonday = (day + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - daysFromMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);

    return { weekStart: start, weekEnd: end };
  }

  private readonly menuInclude: Prisma.MenuInclude = {
    days: {
      orderBy: { dayNumber: 'asc' },
      include: {
        meals: {
          orderBy: { mealType: 'asc' },
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: { product: true },
                },
              },
            },
          },
        },
      },
    },
  };
}
