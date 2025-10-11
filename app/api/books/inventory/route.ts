import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import {
  serializeBookInventoryItem,
  withBookInfrastructure,
} from "../helpers";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const take = Number.isFinite(limitParam)
    ? Math.min(MAX_LIMIT, Math.max(1, limitParam))
    : DEFAULT_LIMIT;

  try {
    const items = await withBookInfrastructure(() =>
      prisma.bookInventoryItem.findMany({
        orderBy: { createdAt: "desc" },
        take,
      }),
    );

    return NextResponse.json({
      items: items.map(serializeBookInventoryItem),
    });
  } catch (error) {
    console.error("Failed to load book inventory", error);
    return NextResponse.json(
      { message: "Не удалось загрузить каталог книг" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("Invalid book inventory payload", error);
    return NextResponse.json(
      { message: "Некорректный формат данных" },
      { status: 400 },
    );
  }

  const title = String(payload.title ?? "").trim();
  const language = String(payload.language ?? "").trim();
  const rawQuantity = Number(payload.quantity);
  const quantity = Number.isFinite(rawQuantity) ? Math.floor(rawQuantity) : NaN;
  const purchasePriceRaw = Number(payload.purchasePrice);
  const salePriceRaw = Number(payload.salePrice);
  const debtRaw = Number(payload.debt);

  if (!title) {
    return NextResponse.json(
      { message: "Укажите название книги" },
      { status: 400 },
    );
  }

  if (!language) {
    return NextResponse.json(
      { message: "Выберите язык книги" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { message: "Введите корректное количество" },
      { status: 400 },
    );
  }

  const purchasePrice = Math.round(purchasePriceRaw * 100) / 100;
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return NextResponse.json(
      { message: "Введите корректную цену закупки" },
      { status: 400 },
    );
  }

  const salePrice = Math.round(salePriceRaw * 100) / 100;
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    return NextResponse.json(
      { message: "Введите корректную цену реализации" },
      { status: 400 },
    );
  }

  const debt = Math.round(debtRaw * 100) / 100;
  if (!Number.isFinite(debt) || debt < 0) {
    return NextResponse.json(
      { message: "Введите корректную сумму долга" },
      { status: 400 },
    );
  }

  try {
    const created = await withBookInfrastructure(() =>
      prisma.bookInventoryItem.create({
        data: {
          title,
          language,
          quantity,
          purchasePrice: new Prisma.Decimal(purchasePrice.toFixed(2)),
          salePrice: new Prisma.Decimal(salePrice.toFixed(2)),
          debt: new Prisma.Decimal(debt.toFixed(2)),
        },
      }),
    );

    return NextResponse.json(
      { item: serializeBookInventoryItem(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to save book inventory item", error);
    return NextResponse.json(
      { message: "Не удалось сохранить книгу" },
      { status: 500 },
    );
  }
}
