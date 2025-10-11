import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import { serialize, withInventoryInfrastructure } from "../helpers";

type RouteContext = {
  params: {
    id: string;
  };
};

const isValidUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value,
  );

export async function PATCH(request: Request, context: RouteContext) {
  const id = context.params.id;

  if (!id || !isValidUuid(id)) {
    return NextResponse.json(
      { message: "Некорректный идентификатор записи" },
      { status: 400 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("Invalid inventory update payload", error);
    return NextResponse.json(
      { message: "Некорректный формат данных" },
      { status: 400 },
    );
  }

  const responsible = String(payload.responsible ?? "").trim();
  const location = String(payload.location ?? "").trim();
  const rawAmount = payload.amount;
  const numericAmount =
    typeof rawAmount === "string" || typeof rawAmount === "number"
      ? Number(rawAmount)
      : NaN;

  if (!location) {
    return NextResponse.json(
      { message: "Укажите статус" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    return NextResponse.json(
      { message: "Введите корректную сумму" },
      { status: 400 },
    );
  }

  const normalizedAmount = Math.round(numericAmount * 100) / 100;

  const data: Prisma.InventoryItemUpdateInput = {
    responsible,
    location,
    amount: new Prisma.Decimal(normalizedAmount.toString()),
  };

  try {
    const updated = await withInventoryInfrastructure(() =>
      prisma.inventoryItem.update({
        where: { id },
        data,
      }),
    );

    return NextResponse.json({ item: serialize(updated) });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Запись не найдена" },
        { status: 404 },
      );
    }

    console.error("Failed to update inventory item", error);
    return NextResponse.json(
      { message: "Не удалось обновить запись" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const id = context.params.id;

  if (!id || !isValidUuid(id)) {
    return NextResponse.json(
      { message: "Некорректный идентификатор записи" },
      { status: 400 },
    );
  }

  try {
    await withInventoryInfrastructure(() =>
      prisma.inventoryItem.delete({
        where: { id },
      }),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Запись не найдена" },
        { status: 404 },
      );
    }

    console.error("Failed to delete inventory item", error);
    return NextResponse.json(
      { message: "Не удалось удалить запись" },
      { status: 500 },
    );
  }

  return NextResponse.json(null, { status: 204 });
}
