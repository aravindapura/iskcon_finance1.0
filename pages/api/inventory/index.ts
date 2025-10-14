import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import {
  serializeInventoryItem,
  withInventoryInfrastructure,
} from "@/lib/server/inventory";

const DEFAULT_LIMIT = 50;
const SEARCH_LIMIT = 10;
const MAX_LIMIT = 100;

type InventoryResponse =
  | { items: Array<ReturnType<typeof serializeInventoryItem>> }
  | { message: string };

const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse<InventoryResponse>,
) => {
  const queryParam = req.query.q;
  const query =
    typeof queryParam === "string" ? queryParam.trim() : Array.isArray(queryParam)
      ? queryParam[0]?.trim() ?? ""
      : "";

  const limitParam = Array.isArray(req.query.limit)
    ? Number(req.query.limit[0])
    : Number(req.query.limit);
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

    return res.status(200).json({
      items: items.map(serializeInventoryItem),
    });
  } catch (error) {
    console.error("Failed to load inventory", error);
    return res
      .status(500)
      .json({ message: "Не удалось загрузить инвентарь" });
  }
};

type CreateInventoryResponse =
  | { item: ReturnType<typeof serializeInventoryItem> }
  | { message: string };

const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse<CreateInventoryResponse>,
) => {
  const payload = req.body as Record<string, unknown> | null;

  if (!payload || typeof payload !== "object") {
    console.error("Invalid inventory payload", payload);
    return res
      .status(400)
      .json({ message: "Некорректный формат данных" });
  }

  const name = String(payload.name ?? "").trim();
  const category = String(payload.category ?? "").trim();
  const responsible = String(payload.responsible ?? "").trim();
  const location = String(payload.location ?? "").trim();
  const rawAmount = Number(payload.amount);
  const amount = Number.isFinite(rawAmount) ? rawAmount : NaN;

  if (!name) {
    return res
      .status(400)
      .json({ message: "Укажите название предмета" });
  }

  if (!category) {
    return res.status(400).json({ message: "Выберите категорию" });
  }

  if (!location) {
    return res.status(400).json({ message: "Укажите статус" });
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return res
      .status(400)
      .json({ message: "Введите корректную сумму" });
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

    return res
      .status(201)
      .json({ item: serializeInventoryItem(created) });
  } catch (error) {
    console.error("Failed to save inventory item", error);
    return res
      .status(500)
      .json({ message: "Не удалось сохранить запись" });
  }
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<InventoryResponse | CreateInventoryResponse>,
) => {
  if (req.method === "GET") {
    return handleGet(req, res);
  }

  if (req.method === "POST") {
    return handlePost(req, res);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Метод не поддерживается" });
};

export default handler;
