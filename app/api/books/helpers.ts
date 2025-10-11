import { Prisma, type BookInventoryItem, type BookSale } from "@prisma/client";

import prisma from "@/lib/prisma";

let hasEnsuredBookInfrastructure = false;
let ensureBookInfrastructurePromise: Promise<void> | null = null;

const ensureBookInfrastructure = async () => {
  if (hasEnsuredBookInfrastructure) {
    return;
  }

  if (!ensureBookInfrastructurePromise) {
    ensureBookInfrastructurePromise = (async () => {
      await prisma.$executeRawUnsafe(
        'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
      );
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "book_inventory_items" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "title" TEXT NOT NULL,
          "language" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "purchase_price" DECIMAL(65,30) NOT NULL,
          "sale_price" DECIMAL(65,30) NOT NULL,
          "debt" DECIMAL(65,30) NOT NULL,
          "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
          CONSTRAINT "book_inventory_items_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "book_sales" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "book_id" UUID NOT NULL,
          "title" TEXT NOT NULL,
          "language" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "sale_price" DECIMAL(65,30) NOT NULL,
          "total" DECIMAL(65,30) NOT NULL,
          "sold_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
          CONSTRAINT "book_sales_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "book_sales_book_id_fkey"
            FOREIGN KEY ("book_id")
            REFERENCES "book_inventory_items"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "book_inventory_items_title_idx" ON "book_inventory_items"("title")',
      );
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "book_inventory_items_language_idx" ON "book_inventory_items"("language")',
      );
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "book_sales_sold_at_idx" ON "book_sales"("sold_at" DESC)',
      );

      hasEnsuredBookInfrastructure = true;
    })()
      .catch((error) => {
        hasEnsuredBookInfrastructure = false;
        throw error;
      })
      .finally(() => {
        ensureBookInfrastructurePromise = null;
      });
  }

  await ensureBookInfrastructurePromise;
};

export const withBookInfrastructure = async <T>(operation: () => Promise<T>) => {
  try {
    await ensureBookInfrastructure();
    return await operation();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      hasEnsuredBookInfrastructure = false;
      await ensureBookInfrastructure();
      return operation();
    }

    throw error;
  }
};

export const serializeBookInventoryItem = (item: BookInventoryItem) => ({
  id: item.id,
  title: item.title,
  language: item.language,
  quantity: item.quantity,
  purchasePrice: Number(item.purchasePrice),
  salePrice: Number(item.salePrice),
  debt: Number(item.debt),
  createdAt: item.createdAt.toISOString(),
});

export const serializeBookSale = (sale: BookSale) => ({
  id: sale.id,
  bookId: sale.bookId,
  title: sale.title,
  language: sale.language,
  quantity: sale.quantity,
  salePrice: Number(sale.salePrice),
  total: Number(sale.total),
  soldAt: sale.soldAt.toISOString(),
});
