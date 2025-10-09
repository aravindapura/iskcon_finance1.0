import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";

import {
  createInventory,
  deleteInventory,
  getAllInventory,
  updateInventory,
} from "@/src/server/services/warehouseService";

type ErrorResponse = { error: string };

type InventoryListResponse = Awaited<ReturnType<typeof getAllInventory>>;
type InventoryResponse = Awaited<ReturnType<typeof createInventory>>;

type InventoryPayload = {
  name: string;
  category: string;
  location: string;
  price: number | null;
  holder: string | null;
  status: string;
};

type InventoryUpdatePayload = Partial<InventoryPayload>;

type RawBody = Record<string, unknown> | null;

type ParseResult<T> = { data: T } | { error: string };

function ensureJsonBody(body: NextApiRequest["body"]): RawBody {
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as RawBody;
    } catch (error) {
      console.error("inventory api: failed to parse body", error);
      return null;
    }
  }

  if (typeof body === "object") {
    return body as RawBody;
  }

  return null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePrice(value: unknown): ParseResult<number | null> {
  if (value === undefined || value === null) {
    return { data: null };
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return { data: null };
  }

  const price = Number.parseFloat(stringValue);
  if (Number.isNaN(price) || price < 0) {
    return { error: "Некорректная стоимость" };
  }

  return { data: price };
}

function parseInventoryCreate(body: RawBody): ParseResult<InventoryPayload> {
  if (!body) {
    return { error: "Некорректные данные" };
  }

  const name = normalizeString(body.name);
  const category = normalizeString(body.category);
  const location = normalizeString(body.location);
  const status = normalizeString(body.status) || "На месте";
  const holder = normalizeString(body.holder);

  if (!name || !category || !location) {
    return { error: "Заполните обязательные поля" };
  }

  const priceResult = parsePrice(body.price);
  if ("error" in priceResult) {
    return priceResult;
  }

  return {
    data: {
      name,
      category,
      location,
      price: priceResult.data,
      holder: holder ? holder : null,
      status,
    },
  };
}

function parseInventoryUpdate(body: RawBody): ParseResult<{ id: number; data: InventoryUpdatePayload }> {
  if (!body) {
    return { error: "Некорректные данные" };
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Некорректный идентификатор" };
  }

  const data: InventoryUpdatePayload = {};

  if (body.name !== undefined) {
    const name = normalizeString(body.name);
    if (!name) {
      return { error: "Название не может быть пустым" };
    }
    data.name = name;
  }

  if (body.category !== undefined) {
    const category = normalizeString(body.category);
    if (!category) {
      return { error: "Категория не может быть пустой" };
    }
    data.category = category;
  }

  if (body.location !== undefined) {
    const location = normalizeString(body.location);
    if (!location) {
      return { error: "Местоположение не может быть пустым" };
    }
    data.location = location;
  }

  if (body.status !== undefined) {
    const status = normalizeString(body.status);
    if (!status) {
      return { error: "Статус не может быть пустым" };
    }
    data.status = status;
  }

  if (body.holder !== undefined) {
    const holder = normalizeString(body.holder);
    data.holder = holder ? holder : null;
  }

  if (body.price !== undefined) {
    const priceResult = parsePrice(body.price);
    if ("error" in priceResult) {
      return priceResult;
    }
    data.price = priceResult.data;
  }

  if (Object.keys(data).length === 0) {
    return { error: "Нет данных для обновления" };
  }

  return { data: { id, data } };
}

function parseDelete(body: RawBody): ParseResult<number> {
  if (!body) {
    return { error: "Некорректные данные" };
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Некорректный идентификатор" };
  }

  return { data: id };
}

function sendError(res: NextApiResponse<ErrorResponse>, status: number, message: string) {
  res.status(status).json({ error: message });
}

function handlePrismaError(res: NextApiResponse<ErrorResponse>, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return sendError(res, 404, "Запись не найдена");
  }

  console.error("inventory api: unexpected error", error);
  return sendError(res, 500, "Не удалось выполнить запрос");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InventoryListResponse | InventoryResponse | { success: true } | ErrorResponse>,
) {
  if (req.method === "GET") {
    try {
      const inventory = await getAllInventory();
      return res.status(200).json(inventory);
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  if (req.method === "POST") {
    const result = parseInventoryCreate(ensureJsonBody(req.body));
    if ("error" in result) {
      return sendError(res, 400, result.error);
    }

    try {
      const created = await createInventory(result.data);
      return res.status(201).json(created);
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  if (req.method === "PUT") {
    const result = parseInventoryUpdate(ensureJsonBody(req.body));
    if ("error" in result) {
      return sendError(res, 400, result.error);
    }

    try {
      const updated = await updateInventory(result.data.id, result.data.data);
      return res.status(200).json(updated);
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  if (req.method === "DELETE") {
    const result = parseDelete(ensureJsonBody(req.body));
    if ("error" in result) {
      return sendError(res, 400, result.error);
    }

    try {
      await deleteInventory(result.data);
      return res.status(200).json({ success: true });
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  res.setHeader("Allow", "GET,POST,PUT,DELETE");
  return res.status(405).json({ error: "Метод не поддерживается" });
}
