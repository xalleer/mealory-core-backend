import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MeasurementUnitType } from '../products/products.types';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteShoppingDto } from './dto/complete-shopping.dto';
import { UpdateShoppingListItemDto } from './dto/update-item.dto';

const WEIGHT_UNITS: MeasurementUnitType[] = ['kg', 'g'];
const VOLUME_UNITS: MeasurementUnitType[] = ['l', 'ml'];

type PriceHistoryEntry = {
  price: number;
  userId: string;
  date: string;
};

type RequirementItem = {
  productId: string;
  quantity: number;
  unit: MeasurementUnitType;
  product: {
    id: string;
    averagePrice: Prisma.Decimal;
    baseUnit: MeasurementUnitType;
    standardPackaging: Prisma.Decimal | null;
  };
};

@Injectable()
export class ShoppingListService {
  private readonly shoppingListInclude: Prisma.ShoppingListInclude = {
    items: {
      orderBy: { createdAt: 'asc' },
      include: { product: true },
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async generateFromMenu(userId: string, menuId: string) {
    const familyId = await this.getUserFamilyId(userId);
    const menu = await this.prisma.menu.findUnique({
      where: { id: menuId },
      select: { id: true, familyId: true },
    });
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }
    if (menu.familyId !== familyId) {
      throw new ForbiddenException('User is not in this family');
    }

    const ingredients = await this.prisma.recipeIngredient.findMany({
      where: {
        recipe: {
          meal: {
            day: {
              menuId,
            },
          },
        },
      },
      include: { product: true },
    });

    const requirements = new Map<string, RequirementItem>();
    for (const ingredient of ingredients) {
      const product = ingredient.product;
      const quantity = ingredient.quantity.toNumber();
      const normalized = this.normalizeIngredientQuantity({
        quantity,
        unit: ingredient.unit,
        product,
      });

      const requirementKey = `${product.id}:${normalized.unit}`;
      const existing = requirements.get(requirementKey);
      if (!existing) {
        requirements.set(requirementKey, {
          productId: product.id,
          quantity: normalized.quantity,
          unit: normalized.unit,
          product,
        });
        continue;
      }

      existing.quantity += normalized.quantity;
    }

    const requirementItems = Array.from(requirements.values());
    const productIds = requirementItems.map(item => item.productId);

    const inventoryItems = await this.prisma.inventory.findMany({
      where: { familyId, productId: { in: productIds } },
    });

    const inventoryByRequirement = new Map<string, number>();
    for (const inventory of inventoryItems) {
      for (const requirement of requirementItems) {
        if (requirement.productId !== inventory.productId) {
          continue;
        }

        const converted = this.convertQuantity({
          quantity: inventory.quantity.toNumber(),
          fromUnit: inventory.unit,
          toUnit: requirement.unit,
          product: requirement.product,
        });

        if (converted == null) {
          continue;
        }

        const requirementKey = `${requirement.productId}:${requirement.unit}`;
        inventoryByRequirement.set(
          requirementKey,
          (inventoryByRequirement.get(requirementKey) ?? 0) + converted,
        );
      }
    }

    const itemsData: Prisma.ShoppingListItemCreateWithoutShoppingListInput[] =
      [];
    let totalPrice = 0;

    for (const requirement of requirementItems) {
      const requirementKey = `${requirement.productId}:${requirement.unit}`;
      const available = inventoryByRequirement.get(requirementKey) ?? 0;
      const needed = requirement.quantity - available;
      if (needed <= 0) {
        continue;
      }

      const averagePrice = requirement.product.averagePrice.toNumber();
      const standardPackaging = requirement.product.standardPackaging
        ? requirement.product.standardPackaging.toNumber()
        : null;

      const estimatedPrice =
        standardPackaging != null &&
        standardPackaging > 0 &&
        requirement.unit === requirement.product.baseUnit &&
        requirement.product.baseUnit !== 'piece'
          ? (needed / standardPackaging) * averagePrice
          : needed * averagePrice;
      totalPrice += estimatedPrice;

      itemsData.push({
        product: { connect: { id: requirement.productId } },
        quantity: new Prisma.Decimal(needed),
        unit: requirement.unit,
        estimatedPrice: new Prisma.Decimal(estimatedPrice),
      });
    }

    return this.prisma.$transaction(async tx => {
      await tx.shoppingList.updateMany({
        where: {
          familyId,
          status: { in: ['pending', 'in_progress'] },
        },
        data: { status: 'completed' },
      });

      return tx.shoppingList.create({
        data: {
          menuId,
          familyId,
          totalPrice: new Prisma.Decimal(totalPrice),
          items: { create: itemsData },
        },
        include: this.shoppingListInclude,
      });
    });
  }

  async getCurrentList(userId: string) {
    const familyId = await this.getUserFamilyId(userId);
    const list = await this.prisma.shoppingList.findFirst({
      where: {
        familyId,
        status: { in: ['pending', 'in_progress'] },
      },
      orderBy: { createdAt: 'desc' },
      include: this.shoppingListInclude,
    });

    if (!list) {
      throw new NotFoundException('Active shopping list not found');
    }

    return list;
  }

  async updateItem(
    userId: string,
    listId: string,
    itemId: string,
    dto: UpdateShoppingListItemDto,
  ) {
    const familyId = await this.getUserFamilyId(userId);
    const item = await this.prisma.shoppingListItem.findUnique({
      where: { id: itemId },
      include: { shoppingList: true },
    });

    if (!item || item.shoppingListId !== listId) {
      throw new NotFoundException('Shopping list item not found');
    }

    if (item.shoppingList.familyId !== familyId) {
      throw new ForbiddenException('User is not in this family');
    }

    const shouldSetInProgress =
      item.shoppingList.status === 'pending' &&
      (dto.isPurchased !== undefined ||
        dto.actualPrice !== undefined ||
        dto.actualQuantity !== undefined);

    return this.prisma.$transaction(async tx => {
      const updatedItem = await tx.shoppingListItem.update({
        where: { id: itemId },
        data: {
          ...(dto.isPurchased !== undefined
            ? { isPurchased: dto.isPurchased }
            : {}),
          ...(dto.actualPrice !== undefined
            ? {
                actualPrice:
                  dto.actualPrice != null
                    ? new Prisma.Decimal(dto.actualPrice)
                    : null,
              }
            : {}),
          ...(dto.actualQuantity !== undefined
            ? {
                actualQuantity:
                  dto.actualQuantity != null
                    ? new Prisma.Decimal(dto.actualQuantity)
                    : null,
              }
            : {}),
        },
        include: { product: true },
      });

      if (shouldSetInProgress) {
        await tx.shoppingList.update({
          where: { id: item.shoppingListId },
          data: { status: 'in_progress' },
        });
      }

      return updatedItem;
    });
  }

  async completeShopping(
    userId: string,
    listId: string,
    dto: CompleteShoppingDto,
  ) {
    const familyId = await this.getUserFamilyId(userId);
    const list = await this.prisma.shoppingList.findUnique({
      where: { id: listId },
      include: {
        items: { include: { product: true } },
        family: true,
      },
    });

    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }
    if (list.familyId !== familyId) {
      throw new ForbiddenException('User is not in this family');
    }
    if (list.status === 'completed') {
      throw new BadRequestException('Shopping list already completed');
    }

    if (dto.items.length === 0) {
      throw new BadRequestException('Shopping list items are required');
    }

    if (dto.items.length !== list.items.length) {
      throw new BadRequestException('All shopping list items must be provided');
    }

    const itemsMap = new Map(list.items.map(item => [item.id, item]));
    for (const entry of dto.items) {
      if (!itemsMap.has(entry.itemId)) {
        throw new BadRequestException('Invalid shopping list item');
      }
    }

    const productIds = list.items.map(item => item.productId);

    return this.prisma.$transaction(async tx => {
      const inventoryItems = await tx.inventory.findMany({
        where: { familyId, productId: { in: productIds } },
      });
      const inventoryMap = new Map<string, (typeof inventoryItems)[number]>();
      for (const inventory of inventoryItems) {
        if (!inventoryMap.has(inventory.productId)) {
          inventoryMap.set(inventory.productId, inventory);
        }
      }

      const productRecords = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(productRecords.map(p => [p.id, p]));

      let totalActualPrice = 0;

      for (const entry of dto.items) {
        const item = itemsMap.get(entry.itemId);
        if (!item) {
          continue;
        }

        const existingActualPrice = item.actualPrice
          ? item.actualPrice.toNumber()
          : null;
        const existingActualQuantity = item.actualQuantity
          ? item.actualQuantity.toNumber()
          : null;

        const actualPrice =
          entry.actualPrice !== undefined
            ? entry.actualPrice
            : existingActualPrice;
        const actualQuantity =
          entry.actualQuantity !== undefined
            ? entry.actualQuantity
            : existingActualQuantity;

        const isPurchased = actualPrice != null || actualQuantity != null;

        if (actualPrice != null) {
          totalActualPrice += actualPrice;
        }

        await tx.shoppingListItem.update({
          where: { id: item.id },
          data: {
            actualPrice:
              actualPrice != null ? new Prisma.Decimal(actualPrice) : null,
            actualQuantity:
              actualQuantity != null
                ? new Prisma.Decimal(actualQuantity)
                : null,
            isPurchased,
          },
        });

        if (actualQuantity != null && actualQuantity > 0) {
          const inventory = inventoryMap.get(item.productId);
          if (inventory) {
            const converted = this.convertQuantity({
              quantity: actualQuantity,
              fromUnit: item.unit,
              toUnit: inventory.unit,
              product: item.product,
            });

            if (converted == null) {
              throw new BadRequestException(
                `Cannot convert ${item.unit} to ${inventory.unit} for inventory update`,
              );
            }

            const nextQuantity = inventory.quantity.toNumber() + converted;

            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantity: new Prisma.Decimal(nextQuantity) },
            });
          } else {
            await tx.inventory.create({
              data: {
                familyId,
                productId: item.productId,
                quantity: new Prisma.Decimal(actualQuantity),
                unit: item.unit,
                addedById: userId,
              },
            });
          }
        }

        if (actualPrice != null) {
          const product = productMap.get(item.productId);
          if (!product) {
            continue;
          }

          const history = Array.isArray(product.priceHistory)
            ? (product.priceHistory as PriceHistoryEntry[])
            : [];

          const nextHistory: PriceHistoryEntry[] = [
            ...history,
            {
              price: actualPrice,
              userId,
              date: new Date().toISOString(),
            },
          ];

          const filteredHistory = this.filterOutliers(nextHistory);
          const averagePrice = this.calculateMedianPrice(nextHistory);

          await tx.product.update({
            where: { id: product.id },
            data: {
              priceHistory: filteredHistory,
              averagePrice: new Prisma.Decimal(averagePrice),
            },
          });
        }
      }

      const budgetUsed = list.family.budgetUsed.toNumber();
      const weeklyBudget = list.family.weeklyBudget
        ? list.family.weeklyBudget.toNumber()
        : null;
      const nextBudgetUsed = budgetUsed + totalActualPrice;

      await tx.family.update({
        where: { id: list.familyId },
        data: { budgetUsed: new Prisma.Decimal(nextBudgetUsed) },
      });

      await tx.shoppingList.update({
        where: { id: list.id },
        data: { status: 'completed' },
      });

      const budgetRemaining =
        weeklyBudget != null ? weeklyBudget - nextBudgetUsed : null;
      const status =
        weeklyBudget != null && budgetRemaining != null && budgetRemaining < 0
          ? 'overspent'
          : 'ok';

      return {
        ok: true,
        budgetUsed: nextBudgetUsed,
        budgetRemaining,
        status,
      };
    });
  }

  async remove(userId: string, listId: string) {
    const familyId = await this.getUserFamilyId(userId);
    const list = await this.prisma.shoppingList.findUnique({
      where: { id: listId },
    });
    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }
    if (list.familyId !== familyId) {
      throw new ForbiddenException('User is not in this family');
    }

    return this.prisma.shoppingList.update({
      where: { id: listId },
      data: { status: 'completed' },
      include: this.shoppingListInclude,
    });
  }

  private normalizeIngredientQuantity(params: {
    quantity: number;
    unit: MeasurementUnitType;
    product: {
      baseUnit: MeasurementUnitType;
      standardPackaging: Prisma.Decimal | null;
    };
  }) {
    const converted = this.convertQuantity({
      quantity: params.quantity,
      fromUnit: params.unit,
      toUnit: params.product.baseUnit,
      product: params.product,
    });

    if (converted == null) {
      return { quantity: params.quantity, unit: params.unit };
    }

    return { quantity: converted, unit: params.product.baseUnit };
  }

  private convertQuantity(params: {
    quantity: number;
    fromUnit: MeasurementUnitType;
    toUnit: MeasurementUnitType;
    product: {
      baseUnit: MeasurementUnitType;
      standardPackaging: Prisma.Decimal | null;
    };
  }) {
    if (params.fromUnit === params.toUnit) {
      return params.quantity;
    }

    if (
      WEIGHT_UNITS.includes(params.fromUnit) &&
      WEIGHT_UNITS.includes(params.toUnit)
    ) {
      if (params.fromUnit === 'kg' && params.toUnit === 'g') {
        return params.quantity * 1000;
      }
      if (params.fromUnit === 'g' && params.toUnit === 'kg') {
        return params.quantity / 1000;
      }
    }

    if (
      VOLUME_UNITS.includes(params.fromUnit) &&
      VOLUME_UNITS.includes(params.toUnit)
    ) {
      if (params.fromUnit === 'l' && params.toUnit === 'ml') {
        return params.quantity * 1000;
      }
      if (params.fromUnit === 'ml' && params.toUnit === 'l') {
        return params.quantity / 1000;
      }
    }

    const standardPackaging = params.product.standardPackaging
      ? params.product.standardPackaging.toNumber()
      : null;

    if (params.fromUnit === 'piece' && params.toUnit !== 'piece') {
      if (
        standardPackaging != null &&
        params.toUnit === params.product.baseUnit
      ) {
        return params.quantity * standardPackaging;
      }
    }

    if (params.toUnit === 'piece' && params.fromUnit !== 'piece') {
      if (
        standardPackaging != null &&
        params.fromUnit === params.product.baseUnit
      ) {
        return params.quantity / standardPackaging;
      }
    }

    return null;
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

  private calculateMedianPrice(priceHistory: PriceHistoryEntry[]): number {
    const filteredHistory = this.filterOutliers(priceHistory);
    const prices = filteredHistory
      .map(entry => entry.price)
      .filter(price => Number.isFinite(price));

    if (!prices.length) {
      return 0;
    }

    return this.calculateMedian(prices);
  }

  private filterOutliers(priceHistory: PriceHistoryEntry[]) {
    const prices = priceHistory
      .map(entry => entry.price)
      .filter(price => Number.isFinite(price));

    if (!prices.length) {
      return priceHistory;
    }

    const median = this.calculateMedian(prices);
    if (median === 0) {
      return priceHistory;
    }

    const maxDeviation = median * 2;
    return priceHistory.filter(
      entry => Math.abs(entry.price - median) <= maxDeviation,
    );
  }

  private calculateMedian(prices: number[]) {
    const sorted = [...prices].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
  }
}
