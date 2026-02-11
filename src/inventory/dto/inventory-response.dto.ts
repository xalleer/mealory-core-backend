import { ApiProperty } from '@nestjs/swagger';
import type { MeasurementUnitType } from '../../products/products.types';
import { MEASUREMENT_UNIT_VALUES } from '../../products/products.types';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

export class InventoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  familyId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: MEASUREMENT_UNIT_VALUES })
  unit!: MeasurementUnitType;

  @ApiProperty()
  addedById!: string;

  @ApiProperty({ required: false })
  expiryDate?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: ProductResponseDto })
  product!: ProductResponseDto;
}
