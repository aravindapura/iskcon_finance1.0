-- Enable required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE IF NOT EXISTS "inventory_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_items_name_idx" ON "inventory_items"("name");
CREATE INDEX IF NOT EXISTS "inventory_items_category_idx" ON "inventory_items"("category");
CREATE INDEX IF NOT EXISTS "inventory_items_responsible_idx" ON "inventory_items"("responsible");
