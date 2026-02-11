import { ApiProperty } from '@nestjs/swagger';
import type { MeasurementUnitType } from '../../products/products.types';
import { ProductResponseDto } from '../../products/dto/product-response.dto';
import type { MealStatusType, MealTypeType } from '../menu.types';
import { MEAL_STATUS_VALUES, MEAL_TYPE_VALUES } from '../menu.types';

export class RecipeIngredientResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unit!: MeasurementUnitType;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ required: false, type: ProductResponseDto })
  product?: ProductResponseDto | null;
}

export class RecipeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  mealId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  nameEn?: string | null;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty({ required: false })
  cookingTime?: number | null;

  @ApiProperty()
  servings!: number;

  @ApiProperty({ required: false })
  calories?: number | null;

  @ApiProperty({ required: false })
  protein?: number | null;

  @ApiProperty({ required: false })
  fats?: number | null;

  @ApiProperty({ required: false })
  carbs?: number | null;

  @ApiProperty()
  instructions!: unknown;

  @ApiProperty({ required: false })
  imageUrl?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [RecipeIngredientResponseDto] })
  ingredients!: RecipeIngredientResponseDto[];
}

export class MealResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  dayId!: string;

  @ApiProperty({ required: false })
  familyMemberId?: string | null;

  @ApiProperty({ enum: MEAL_TYPE_VALUES })
  mealType!: MealTypeType;

  @ApiProperty({ enum: MEAL_STATUS_VALUES })
  status!: MealStatusType;

  @ApiProperty({ required: false })
  scheduledTime?: Date | null;

  @ApiProperty({ required: false })
  completedAt?: Date | null;

  @ApiProperty({ required: false, type: RecipeResponseDto })
  recipe?: RecipeResponseDto | null;
}

export class DayResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  menuId!: string;

  @ApiProperty()
  date!: Date;

  @ApiProperty()
  dayNumber!: number;

  @ApiProperty({ type: [MealResponseDto] })
  meals!: MealResponseDto[];
}

export class MenuResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  familyId!: string;

  @ApiProperty()
  weekStart!: Date;

  @ApiProperty()
  weekEnd!: Date;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [DayResponseDto] })
  days!: DayResponseDto[];
}
