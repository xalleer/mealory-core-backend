-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('meat', 'poultry', 'fish', 'dairy', 'eggs', 'vegetables', 'fruits', 'grains', 'pasta', 'bakery', 'oils', 'spices', 'sweets', 'beverages', 'canned', 'frozen', 'nuts', 'other');

-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('kg', 'g', 'l', 'ml', 'piece');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "category" "ProductCategory" NOT NULL,
    "average_price" DECIMAL(10,2) NOT NULL,
    "price_history" JSONB NOT NULL,
    "base_unit" "MeasurementUnit" NOT NULL,
    "standard_packaging" DECIMAL(10,3),
    "calories" INTEGER,
    "protein" DECIMAL(6,2),
    "fats" DECIMAL(6,2),
    "carbs" DECIMAL(6,2),
    "allergens" JSONB NOT NULL,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
