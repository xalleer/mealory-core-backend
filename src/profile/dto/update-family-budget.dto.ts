import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateFamilyBudgetDto {
  @ApiProperty({ type: Number, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weeklyBudget!: number;
}
