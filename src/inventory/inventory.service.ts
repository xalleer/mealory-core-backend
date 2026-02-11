import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MeasurementUnitType } from '../products/products.types';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { AddProductDto } from './dto/add-product.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

const WEIGHT_UNITS: MeasurementUnitType[] = ['kg', 'g'];
const VOLUME_UNITS: MeasurementUnitType[] = ['l', 'ml'];

@Injectable()
export class InventoryService {
  private readonly inventoryInclude: Prisma.InventoryInclude = {
    product: true,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async addProduct(userId: string, dto: AddProductDto) {
    const familyId = await this.getUserFamilyId(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const deductFromBudget = dto.deductFromBudget ?? false;
    if (deductFromBudget && dto.actualPrice == null) {
      throw new BadRequestException(
        'actualPrice is required when deductFromBudget is true',
      );
    }

    const inventoryItem = await this.prisma.$transaction(async tx => {
      const existing = await tx.inventory.findFirst({
        where: { familyId, productId: dto.productId },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        const converted = this.convertQuantity({
          quantity: dto.quantity,
          fromUnit: dto.unit,
          toUnit: existing.unit,
          product,
        });

        if (converted == null) {
          throw new BadRequestException(
            `Cannot convert ${dto.unit} to ${existing.unit} for inventory update`,
          );
        }

        const nextQuantity = existing.quantity.toNumber() + converted;

        const saved = await tx.inventory.update({
          where: { id: existing.id },
          data: {
            quantity: new Prisma.Decimal(nextQuantity),
            ...(dto.expiryDate !== undefined
              ? { expiryDate: dto.expiryDate }
              : {}),
          },
          include: this.inventoryInclude,
        });

        if (deductFromBudget && dto.actualPrice != null) {
          const family = await tx.family.findUnique({
            where: { id: familyId },
          });
          if (!family) {
            throw new NotFoundException('Family not found');
          }

          const nextBudgetUsed = family.budgetUsed.toNumber() + dto.actualPrice;
          await tx.family.update({
            where: { id: familyId },
            data: { budgetUsed: new Prisma.Decimal(nextBudgetUsed) },
          });
        }

        return saved;
      } else {
        const saved = await tx.inventory.create({
          data: {
            familyId,
            productId: dto.productId,
            quantity: new Prisma.Decimal(dto.quantity),
            unit: dto.unit,
            addedById: userId,
            expiryDate: dto.expiryDate ?? null,
          },
          include: this.inventoryInclude,
        });

        if (deductFromBudget && dto.actualPrice != null) {
          const family = await tx.family.findUnique({
            where: { id: familyId },
          });
          if (!family) {
            throw new NotFoundException('Family not found');
          }

          const nextBudgetUsed = family.budgetUsed.toNumber() + dto.actualPrice;
          await tx.family.update({
            where: { id: familyId },
            data: { budgetUsed: new Prisma.Decimal(nextBudgetUsed) },
          });
        }

        return saved;
      }
    });

    if (dto.actualPrice != null) {
      await this.productsService.updatePrice(dto.productId, {
        price: dto.actualPrice,
        userId,
      });
    }

    return inventoryItem;
  }

  async findAll(userId: string, filters: { expiringInDays?: number } = {}) {
    const familyId = await this.getUserFamilyId(userId);

    const where: Prisma.InventoryWhereInput = {
      familyId,
    };

    if (filters.expiringInDays != null) {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + filters.expiringInDays);

      where.expiryDate = {
        not: null,
        gte: now,
        lte: end,
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        include: this.inventoryInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(userId: string, id: string) {
    const familyId = await this.getUserFamilyId(userId);

    const item = await this.prisma.inventory.findUnique({
      where: { id },
      include: this.inventoryInclude,
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    if (item.familyId !== familyId) {
      throw new ForbiddenException('User is not in this family');
    }

    return item;
  }

  async update(userId: string, id: string, dto: UpdateInventoryItemDto) {
    const familyId = await this.getUserFamilyId(userId);

    const item = await this.prisma.inventory.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    if (item.familyId !== familyId) {
      throw new ForbiddenException('User is not in this family');
    }

    return this.prisma.inventory.update({
      where: { id },
      data: {
        ...(dto.quantity !== undefined
          ? { quantity: new Prisma.Decimal(dto.quantity) }
          : {}),
        ...(dto.expiryDate !== undefined ? { expiryDate: dto.expiryDate } : {}),
      },
      include: this.inventoryInclude,
    });
  }

  async remove(userId: string, id: string) {
    const familyId = await this.getUserFamilyId(userId);

    const item = await this.prisma.inventory.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    if (item.familyId !== familyId) {
      throw new ForbiddenException('User is not in this family');
    }

    return this.prisma.inventory.delete({
      where: { id },
      include: this.inventoryInclude,
    });
  }

  async deductIngredients(
    familyId: string,
    ingredients: Array<{
      productId: string;
      quantity: number;
      unit: MeasurementUnitType;
    }>,
  ) {
    if (!ingredients.length) {
      return { ok: true };
    }

    const productIds = Array.from(new Set(ingredients.map(i => i.productId)));

    return this.prisma.$transaction(async tx => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      const inventoryItems = await tx.inventory.findMany({
        where: { familyId, productId: { in: productIds } },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      });

      const inventoryByProduct = new Map<string, typeof inventoryItems>();
      for (const inv of inventoryItems) {
        const list = inventoryByProduct.get(inv.productId);
        if (list) {
          list.push(inv);
        } else {
          inventoryByProduct.set(inv.productId, [inv]);
        }
      }

      for (const ingredient of ingredients) {
        const product = productMap.get(ingredient.productId);
        if (!product) {
          throw new NotFoundException('Product not found');
        }

        let remaining = ingredient.quantity;
        const candidates = inventoryByProduct.get(ingredient.productId) ?? [];

        for (const inv of candidates) {
          if (remaining <= 0) {
            break;
          }

          const availableInIngredientUnit = this.convertQuantity({
            quantity: inv.quantity.toNumber(),
            fromUnit: inv.unit,
            toUnit: ingredient.unit,
            product,
          });

          if (availableInIngredientUnit == null) {
            throw new BadRequestException(
              `Cannot convert ${inv.unit} to ${ingredient.unit} for inventory deduction`,
            );
          }

          const take = Math.min(availableInIngredientUnit, remaining);

          const takeInInventoryUnit = this.convertQuantity({
            quantity: take,
            fromUnit: ingredient.unit,
            toUnit: inv.unit,
            product,
          });

          if (takeInInventoryUnit == null) {
            throw new BadRequestException(
              `Cannot convert ${ingredient.unit} to ${inv.unit} for inventory deduction`,
            );
          }

          const nextQuantity = inv.quantity.toNumber() - takeInInventoryUnit;

          if (nextQuantity <= 0) {
            await tx.inventory.delete({ where: { id: inv.id } });
          } else {
            await tx.inventory.update({
              where: { id: inv.id },
              data: { quantity: new Prisma.Decimal(nextQuantity) },
            });
          }

          remaining -= take;
        }

        if (remaining > 0) {
          throw new BadRequestException(
            'Not enough inventory to deduct ingredients',
          );
        }
      }

      return { ok: true };
    });
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
}
