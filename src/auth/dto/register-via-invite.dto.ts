import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import * as authTypes from '../auth.types';

export class RegisterViaInviteDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  height!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  weight!: number;

  @ApiProperty({ enum: authTypes.GOAL_VALUES })
  @IsIn(authTypes.GOAL_VALUES)
  goal!: authTypes.GoalType;

  @ApiProperty({
    enum: authTypes.MEAL_TIME_VALUES,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsIn(authTypes.MEAL_TIME_VALUES, { each: true })
  mealTimes?: authTypes.MealTimeType[];

  @ApiProperty({
    enum: authTypes.ALLERGY_VALUES,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsIn(authTypes.ALLERGY_VALUES, { each: true })
  allergies?: authTypes.AllergyType[];
}
