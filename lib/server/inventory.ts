import { Prisma, type InventoryItem } from "@prisma/client";

import prisma from "@/lib/prisma";

let hasEnsuredInventoryInfrastructure = false;
let ensureInventoryInfrastructurePromise: Promise<void> | null = null;

const ensureInventoryInfrastructure = async () => {
  if (hasEnsuredInventoryInfrastructure) {
    return;
  }

  if (!ensureInventoryInfrastructurePromise) {
    ensureInventoryInfrastructurePromise = (async () => {
      await prisma.$executeRawUnsafe(
        'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
      );
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "inventory_items" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "name" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "responsible" TEXT NOT NULL,
          "location" TEXT NOT NULL,
          "amount" DECIMAL(65,30) NOT NULL,
          "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
          CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "inventory_items_name_idx" ON "inventory_items"("name")',
      );
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "inventory_items_category_idx" ON "inventory_items"("category")',
      );
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "inventory_items_responsible_idx" ON "inventory_items"("responsible")',
      );

      hasEnsuredInventoryInfrastructure = true;
    })()
      .catch((error) => {
        hasEnsuredInventoryInfrastructure = false;
        throw error;
      })
      .finally(() => {
        ensureInventoryInfrastructurePromise = null;
      });
  }

  await ensureInventoryInfrastructurePromise;
};

export const withInventoryInfrastructure = async <T>(
  operation: () => Promise<T>,
) => {
  try {
    await ensureInventoryInfrastructure();
    return await operation();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      hasEnsuredInventoryInfrastructure = false;
      await ensureInventoryInfrastructure();
      return operation();
    }

    throw error;
  }
};

export const serializeInventoryItem = (item: InventoryItem) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  responsible: item.responsible,
  location: item.location,
  amount: Number(item.amount),
  createdAt: item.createdAt.toISOString(),
});
