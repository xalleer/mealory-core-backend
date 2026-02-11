import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { MealStatusType } from '../menu.types';
import { MEAL_STATUS_VALUES } from '../menu.types';

export class UpdateMealStatusDto {
  @ApiProperty({ enum: MEAL_STATUS_VALUES })
  @IsIn(MEAL_STATUS_VALUES)
  status!: MealStatusType;
}
