import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class CompleteShoppingItemDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualQuantity?: number;
}

export class CompleteShoppingDto {
  @ApiProperty({ type: [CompleteShoppingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteShoppingItemDto)
  items!: CompleteShoppingItemDto[];
}
