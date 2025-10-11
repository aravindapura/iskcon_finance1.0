import { NextResponse } from "next/server";
import { Prisma, type InventoryItem } from "@prisma/client";

import prisma from "@/lib/prisma";

const DEFAULT_LIMIT = 50;
const SEARCH_LIMIT = 10;
const MAX_LIMIT = 100;

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

export const serialize = (item: InventoryItem) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  responsible: item.responsible,
  location: item.location,
  amount: Number(item.amount),
  createdAt: item.createdAt.toISOString(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit"));
  const requestedLimit = Number.isFinite(limitParam)
    ? limitParam
    : query
      ? SEARCH_LIMIT
      : DEFAULT_LIMIT;
  const take = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));

  try {
    const items = await withInventoryInfrastructure(() =>
      prisma.inventoryItem.findMany({
        where: query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
                { responsible: { contains: query, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { createdAt: "desc" },
        take,
      }),
    );

    return NextResponse.json({ items: items.map(serialize) });
  } catch (error) {
    console.error("Failed to load inventory", error);
    return NextResponse.json(
      { message: "Не удалось загрузить инвентарь" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("Invalid inventory payload", error);
    return NextResponse.json(
      { message: "Некорректный формат данных" },
      { status: 400 },
    );
  }

  const name = String(payload.name ?? "").trim();
  const category = String(payload.category ?? "").trim();
  const responsible = String(payload.responsible ?? "").trim();
  const location = String(payload.location ?? "").trim();
  const rawAmount = Number(payload.amount);
  const amount = Number.isFinite(rawAmount) ? rawAmount : NaN;

  if (!name) {
    return NextResponse.json(
      { message: "Укажите название предмета" },
      { status: 400 },
    );
  }

  if (!category) {
    return NextResponse.json(
      { message: "Выберите категорию" },
      { status: 400 },
    );
  }

  if (!location) {
    return NextResponse.json(
      { message: "Укажите статус" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json(
      { message: "Введите корректную сумму" },
      { status: 400 },
    );
  }

  const normalizedAmount = Math.round(amount * 100) / 100;

  try {
    const created = await withInventoryInfrastructure(() =>
      prisma.inventoryItem.create({
        data: {
          name,
          category,
          responsible,
          location,
          amount: new Prisma.Decimal(normalizedAmount.toString()),
        },
      }),
    );

    return NextResponse.json({ item: serialize(created) }, { status: 201 });
  } catch (error) {
    console.error("Failed to save inventory item", error);
    return NextResponse.json(
      { message: "Не удалось сохранить запись" },
      { status: 500 },
    );
  }
}
