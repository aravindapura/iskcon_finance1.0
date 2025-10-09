import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ErrorResponse = { error: string; details?: string };

type SuccessResponse = { success: true };

type InventoryListResponse = Awaited<ReturnType<typeof prisma.inventory.findMany>>;
type InventoryRecord = Awaited<ReturnType<typeof prisma.inventory.create>>;

type InventoryPayload = {
  id?: unknown;
  name?: unknown;
  category?: unknown;
  location?: unknown;
  price?: unknown;
  holder?: unknown;
  status?: unknown;
};

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
};

const parsePrice = (value: unknown) => {
  if (value === undefined || value === null) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const parsed = Number.parseFloat(raw) || 0;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    InventoryListResponse | InventoryRecord | SuccessResponse | ErrorResponse
  >,
) {
  try {
    if (req.method === "GET") {
      const inventory = await prisma.inventory.findMany();
      return res.status(200).json(inventory);
    }

    if (req.method === "POST") {
      const { name, category, location, price, holder, status } =
        (req.body ?? {}) as InventoryPayload;

      const normalizedName = normalizeString(name);
      const normalizedCategory = normalizeString(category);
      const normalizedLocation = normalizeString(location);

      if (!normalizedName || !normalizedCategory || !normalizedLocation) {
        return res.status(400).json({ error: "Не заполнены обязательные поля" });
      }

      const priceValue = parsePrice(price);
      if (price !== undefined && price !== null && priceValue === null) {
        return res.status(400).json({ error: "Некорректная стоимость" });
      }

      const newItem = await prisma.inventory.create({
        data: {
          name: normalizedName,
          category: normalizedCategory,
          location: normalizedLocation,
          price: priceValue,
          holder: normalizeOptionalString(holder),
          status: normalizeString(status) || "На месте",
        },
      });

      return res.status(201).json(newItem);
    }

    if (req.method === "PUT") {
      const { id, name, category, location, price, holder, status } =
        (req.body ?? {}) as InventoryPayload;

      const itemId = Number(id);
      if (!Number.isInteger(itemId) || itemId <= 0) {
        return res.status(400).json({ error: "Некорректный идентификатор" });
      }

      const updateData: Record<string, unknown> = {};

      if (name !== undefined) {
        const value = normalizeString(name);
        if (!value) {
          return res.status(400).json({ error: "Название не может быть пустым" });
        }
        updateData.name = value;
      }

      if (category !== undefined) {
        const value = normalizeString(category);
        if (!value) {
          return res.status(400).json({ error: "Категория не может быть пустой" });
        }
        updateData.category = value;
      }

      if (location !== undefined) {
        const value = normalizeString(location);
        if (!value) {
          return res.status(400).json({ error: "Местоположение не может быть пустым" });
        }
        updateData.location = value;
      }

      if (status !== undefined) {
        const value = normalizeString(status);
        if (!value) {
          return res.status(400).json({ error: "Статус не может быть пустым" });
        }
        updateData.status = value;
      }

      if (holder !== undefined) {
        updateData.holder = normalizeOptionalString(holder);
      }

      if (price !== undefined) {
        const priceValue = parsePrice(price);
        if (priceValue === null && String(price ?? "").trim() !== "") {
          return res.status(400).json({ error: "Некорректная стоимость" });
        }
        updateData.price = priceValue;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "Нет данных для обновления" });
      }

      const updatedItem = await prisma.inventory.update({
        where: { id: itemId },
        data: updateData,
      });

      return res.status(200).json(updatedItem);
    }

    if (req.method === "DELETE") {
      const { id } = (req.body ?? {}) as InventoryPayload;
      const itemId = Number(id);

      if (!Number.isInteger(itemId) || itemId <= 0) {
        return res.status(400).json({ error: "Некорректный идентификатор" });
      }

      await prisma.inventory.delete({ where: { id: itemId } });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return res.status(405).json({ error: "Метод не поддерживается" });
  } catch (err) {
    console.error("API error:", err);
    const details = err instanceof Error ? err.message : "Неизвестная ошибка";
    return res.status(500).json({ error: "Ошибка сервера", details });
  }
}
