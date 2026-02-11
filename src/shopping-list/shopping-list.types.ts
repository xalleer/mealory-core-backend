export const SHOPPING_LIST_STATUS_VALUES = [
  'pending',
  'in_progress',
  'completed',
] as const;

export type ShoppingListStatusType =
  (typeof SHOPPING_LIST_STATUS_VALUES)[number];
