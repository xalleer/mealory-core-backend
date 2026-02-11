export const MEAL_TYPE_VALUES = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
] as const;

export const MEAL_STATUS_VALUES = [
  'pending',
  'cooking',
  'completed',
  'skipped',
  'auto_skipped',
] as const;

export type MealTypeType = (typeof MEAL_TYPE_VALUES)[number];
export type MealStatusType = (typeof MEAL_STATUS_VALUES)[number];
