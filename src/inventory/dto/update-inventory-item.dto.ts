import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ type: Date })
  @IsOptional()
  @Type(() => Date)
  @ValidateIf(o => o.expiryDate !== null)
  @IsDate()
  expiryDate?: Date | null;
}
