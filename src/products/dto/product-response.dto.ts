import { ApiProperty } from '@nestjs/swagger';
import type { AllergyType } from '../../auth/auth.types';
import { ALLERGY_VALUES } from '../../auth/auth.types';
import type {
  MeasurementUnitType,
  ProductCategoryType,
} from '../products.types';
import {
  MEASUREMENT_UNIT_VALUES,
  PRODUCT_CATEGORY_VALUES,
} from '../products.types';

export class PriceHistoryEntryDto {
  @ApiProperty()
  price!: number;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  date!: string;
}

export class ProductResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  nameEn?: string | null;

  @ApiProperty({ enum: PRODUCT_CATEGORY_VALUES })
  category!: ProductCategoryType;

  @ApiProperty()
  averagePrice!: number;

  @ApiProperty({ type: [PriceHistoryEntryDto] })
  priceHistory!: PriceHistoryEntryDto[];

  @ApiProperty({ enum: MEASUREMENT_UNIT_VALUES })
  baseUnit!: MeasurementUnitType;

  @ApiProperty({ required: false })
  standardPackaging?: number | null;

  @ApiProperty({ required: false })
  calories?: number | null;

  @ApiProperty({ required: false })
  protein?: number | null;

  @ApiProperty({ required: false })
  fats?: number | null;

  @ApiProperty({ required: false })
  carbs?: number | null;

  @ApiProperty({ enum: ALLERGY_VALUES, isArray: true })
  allergens!: AllergyType[];

  @ApiProperty({ required: false })
  imageUrl?: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ProductListResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  items!: ProductResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
