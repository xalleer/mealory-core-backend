import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { AllergyType, GoalType, MealTimeType } from '../auth.types';
import { ALLERGY_VALUES, GOAL_VALUES, MEAL_TIME_VALUES } from '../auth.types';

class CompleteProfileFamilyMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: MEAL_TIME_VALUES, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsIn(MEAL_TIME_VALUES, { each: true })
  mealTimes?: MealTimeType[];

  @ApiProperty({ enum: ALLERGY_VALUES, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsIn(ALLERGY_VALUES, { each: true })
  allergies?: AllergyType[];
}

export class CompleteProfileDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  height!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  weight!: number;

  @ApiProperty({ enum: GOAL_VALUES })
  @IsIn(GOAL_VALUES)
  goal!: GoalType;

  @ApiProperty({ enum: MEAL_TIME_VALUES, isArray: true })
  @IsArray()
  @IsIn(MEAL_TIME_VALUES, { each: true })
  mealTimes!: MealTimeType[];

  @ApiProperty({ enum: ALLERGY_VALUES, isArray: true })
  @IsArray()
  @IsIn(ALLERGY_VALUES, { each: true })
  allergies!: AllergyType[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyBudget?: number;

  @ApiProperty({ required: false, type: [CompleteProfileFamilyMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteProfileFamilyMemberDto)
  familyMembers?: CompleteProfileFamilyMemberDto[];
}
