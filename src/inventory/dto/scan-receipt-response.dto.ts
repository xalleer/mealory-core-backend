import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ScanReceiptParsedItemDto {
  @ApiProperty({ required: false, nullable: true })
  @ValidateIf(o => o.productId != null)
  @IsUUID()
  productId!: string | null;

  @ApiProperty()
  @IsString()
  productName!: string;

  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiProperty({ type: Number, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty()
  @IsBoolean()
  needsReview!: boolean;
}

export class ScanReceiptResponseDto {
  @ApiProperty({ type: [ScanReceiptParsedItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScanReceiptParsedItemDto)
  items!: ScanReceiptParsedItemDto[];
}
