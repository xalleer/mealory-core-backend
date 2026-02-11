export const PRODUCT_CATEGORY_VALUES = [
  'meat',
  'poultry',
  'fish',
  'dairy',
  'eggs',
  'vegetables',
  'fruits',
  'grains',
  'pasta',
  'bakery',
  'oils',
  'spices',
  'sweets',
  'beverages',
  'canned',
  'frozen',
  'nuts',
  'other',
] as const;

export const MEASUREMENT_UNIT_VALUES = ['kg', 'g', 'l', 'ml', 'piece'] as const;

export type ProductCategoryType = (typeof PRODUCT_CATEGORY_VALUES)[number];
export type MeasurementUnitType = (typeof MEASUREMENT_UNIT_VALUES)[number];

export const PRODUCT_SORT_BY_VALUES = [
  'createdAt',
  'updatedAt',
  'name',
  'averagePrice',
] as const;

export type ProductSortByType = (typeof PRODUCT_SORT_BY_VALUES)[number];
export type ProductSortOrderType = 'asc' | 'desc';
