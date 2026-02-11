import { ApiProperty } from '@nestjs/swagger';
import type { MeasurementUnitType } from '../../products/products.types';
import { MEASUREMENT_UNIT_VALUES } from '../../products/products.types';
import { ProductResponseDto } from '../../products/dto/product-response.dto';
import type { ShoppingListStatusType } from '../shopping-list.types';
import { SHOPPING_LIST_STATUS_VALUES } from '../shopping-list.types';

export class ShoppingListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  shoppingListId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: MEASUREMENT_UNIT_VALUES })
  unit!: MeasurementUnitType;

  @ApiProperty()
  estimatedPrice!: number;

  @ApiProperty({ required: false })
  actualPrice?: number | null;

  @ApiProperty({ required: false })
  actualQuantity?: number | null;

  @ApiProperty()
  isPurchased!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: ProductResponseDto, required: false })
  product?: ProductResponseDto | null;
}

export class ShoppingListResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  menuId!: string;

  @ApiProperty()
  familyId!: string;

  @ApiProperty({ enum: SHOPPING_LIST_STATUS_VALUES })
  status!: ShoppingListStatusType;

  @ApiProperty()
  totalPrice!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [ShoppingListItemResponseDto] })
  items!: ShoppingListItemResponseDto[];
}
