import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import { serialize, withInventoryInfrastructure } from "./helpers";

const DEFAULT_LIMIT = 50;
const SEARCH_LIMIT = 10;
const MAX_LIMIT = 100;

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
