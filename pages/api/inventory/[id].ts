import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import {
  serializeInventoryItem,
  withInventoryInfrastructure,
} from "@/lib/server/inventory";

type InventoryItemResponse =
  | { item: ReturnType<typeof serializeInventoryItem> }
  | { message: string };

const isValidUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value,
  );

const getIdFromRequest = (req: NextApiRequest) => {
  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  return typeof rawId === "string" ? rawId : "";
};

const handlePatch = async (
  req: NextApiRequest,
  res: NextApiResponse<InventoryItemResponse | { message: string }>,
) => {
  const id = getIdFromRequest(req);

  if (!id || !isValidUuid(id)) {
    return res
      .status(400)
      .json({ message: "Некорректный идентификатор записи" });
  }

  const payload = req.body as Record<string, unknown> | null;

  if (!payload || typeof payload !== "object") {
    console.error("Invalid inventory update payload", payload);
    return res
      .status(400)
      .json({ message: "Некорректный формат данных" });
  }

  const responsible = String(payload.responsible ?? "").trim();
  const location = String(payload.location ?? "").trim();
  const rawAmount = payload.amount;
  const numericAmount =
    typeof rawAmount === "string" || typeof rawAmount === "number"
      ? Number(rawAmount)
      : NaN;

  if (!location) {
    return res.status(400).json({ message: "Укажите статус" });
  }

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    return res
      .status(400)
      .json({ message: "Введите корректную сумму" });
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

    return res
      .status(200)
      .json({ item: serializeInventoryItem(updated) });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Запись не найдена" });
    }

    console.error("Failed to update inventory item", error);
    return res
      .status(500)
      .json({ message: "Не удалось обновить запись" });
  }
};

const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse<InventoryItemResponse | { message: string }>,
) => {
  const id = getIdFromRequest(req);

  if (!id || !isValidUuid(id)) {
    return res
      .status(400)
      .json({ message: "Некорректный идентификатор записи" });
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
      return res.status(404).json({ message: "Запись не найдена" });
    }

    console.error("Failed to delete inventory item", error);
    return res
      .status(500)
      .json({ message: "Не удалось удалить запись" });
  }

  res.status(204).end();
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<InventoryItemResponse | { message: string }>,
) => {
  if (req.method === "PATCH") {
    await handlePatch(req, res);
    return;
  }

  if (req.method === "DELETE") {
    await handleDelete(req, res);
    return;
  }

  res.setHeader("Allow", ["PATCH", "DELETE"]);
  res.status(405).json({ message: "Метод не поддерживается" });
};

export default handler;
