import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import type { GoalType } from '../../auth/auth.types';
import { GOAL_VALUES } from '../../auth/auth.types';

export class UpdateProfileDto {
  @ApiPropertyOptional({ type: String, minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weight?: number;

  @ApiPropertyOptional({ enum: GOAL_VALUES })
  @IsOptional()
  @IsIn(GOAL_VALUES)
  goal?: GoalType;
}
