import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class UpdatePriceDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty()
  @IsUUID()
  userId!: string;
}
