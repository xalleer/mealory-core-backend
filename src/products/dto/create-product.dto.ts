import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
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

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ enum: PRODUCT_CATEGORY_VALUES })
  @IsIn(PRODUCT_CATEGORY_VALUES)
  category!: ProductCategoryType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  averagePrice!: number;

  @ApiProperty({ enum: MEASUREMENT_UNIT_VALUES })
  @IsIn(MEASUREMENT_UNIT_VALUES)
  baseUnit!: MeasurementUnitType;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  standardPackaging?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  protein?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fats?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carbs?: number;

  @ApiProperty({ enum: ALLERGY_VALUES, isArray: true })
  @IsArray()
  @IsIn(ALLERGY_VALUES, { each: true })
  allergens!: AllergyType[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
