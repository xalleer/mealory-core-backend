import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import type { MeasurementUnitType } from '../../products/products.types';
import { MEASUREMENT_UNIT_VALUES } from '../../products/products.types';

export class AddProductDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ type: Number, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ enum: MEASUREMENT_UNIT_VALUES })
  @IsIn(MEASUREMENT_UNIT_VALUES)
  unit!: MeasurementUnitType;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  deductFromBudget?: boolean;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @ValidateIf(o => o.deductFromBudget === true)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualPrice?: number;

  @ApiPropertyOptional({ type: Date })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;
}
