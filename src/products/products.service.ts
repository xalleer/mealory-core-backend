import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import type {
  ProductCategoryType,
  ProductSortByType,
  ProductSortOrderType,
} from './products.types';

type PriceHistoryEntry = {
  price: number;
  userId: string;
  date: string;
};

type FindAllFilters = {
  page?: number;
  limit?: number;
  category?: ProductCategoryType;
  isActive?: boolean;
  search?: string;
  sortBy?: ProductSortByType;
  sortOrder?: ProductSortOrderType;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const now = new Date();

    return this.prisma.product.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn ?? null,
        category: dto.category,
        averagePrice: new Prisma.Decimal(dto.averagePrice),
        priceHistory: [
          {
            price: dto.averagePrice,
            userId: 'system',
            date: now.toISOString(),
          },
        ],
        baseUnit: dto.baseUnit,
        standardPackaging:
          dto.standardPackaging != null
            ? new Prisma.Decimal(dto.standardPackaging)
            : null,
        calories: dto.calories ?? null,
        protein: dto.protein != null ? new Prisma.Decimal(dto.protein) : null,
        fats: dto.fats != null ? new Prisma.Decimal(dto.fats) : null,
        carbs: dto.carbs != null ? new Prisma.Decimal(dto.carbs) : null,
        allergens: dto.allergens,
        imageUrl: dto.imageUrl ?? null,
      },
    });
  }

  async findAll(filters: FindAllFilters = {}) {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be positive numbers');
    }

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.isActive != null ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { nameEn: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc',
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.averagePrice !== undefined
          ? { averagePrice: new Prisma.Decimal(dto.averagePrice) }
          : {}),
        ...(dto.baseUnit ? { baseUnit: dto.baseUnit } : {}),
        ...(dto.standardPackaging !== undefined
          ? {
              standardPackaging:
                dto.standardPackaging != null
                  ? new Prisma.Decimal(dto.standardPackaging)
                  : null,
            }
          : {}),
        ...(dto.calories !== undefined ? { calories: dto.calories } : {}),
        ...(dto.protein !== undefined
          ? {
              protein:
                dto.protein != null ? new Prisma.Decimal(dto.protein) : null,
            }
          : {}),
        ...(dto.fats !== undefined
          ? { fats: dto.fats != null ? new Prisma.Decimal(dto.fats) : null }
          : {}),
        ...(dto.carbs !== undefined
          ? { carbs: dto.carbs != null ? new Prisma.Decimal(dto.carbs) : null }
          : {}),
        ...(dto.allergens ? { allergens: dto.allergens } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      },
    });
  }

  async updatePrice(id: string, dto: UpdatePriceDto) {
    return this.prisma.$transaction(async tx => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const existingHistory = Array.isArray(product.priceHistory)
        ? (product.priceHistory as PriceHistoryEntry[])
        : [];

      const nextHistory: PriceHistoryEntry[] = [
        ...existingHistory,
        {
          price: dto.price,
          userId: dto.userId,
          date: new Date().toISOString(),
        },
      ];

      const filteredHistory = this.filterOutliers(nextHistory);
      const averagePrice = this.calculateMedianPrice(nextHistory);

      return tx.product.update({
        where: { id },
        data: {
          priceHistory: filteredHistory,
          averagePrice: new Prisma.Decimal(averagePrice),
        },
      });
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
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
