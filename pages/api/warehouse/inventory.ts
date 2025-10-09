import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ErrorResponse = { error: string };

type SuccessResponse = { success: true };

function sendError(res: NextApiResponse<ErrorResponse>, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parsePriceInput(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | SuccessResponse | unknown>,
) {
  try {
    if (req.method === "GET") {
      const items = await prisma.inventory.findMany();
      return res.status(200).json(items);
    }

    if (req.method === "POST") {
      const name = normalizeString(req.body?.name);
      const category = normalizeString(req.body?.category);
      const location = normalizeString(req.body?.location);
      const status = normalizeString(req.body?.status) || "На месте";
      const holder = normalizeString(req.body?.holder);

      if (!name || !category || !location) {
        return sendError(res, 400, "Не заполнены обязательные поля");
      }

      const price = parsePriceInput(req.body?.price);

      const newItem = await prisma.inventory.create({
        data: {
          name,
          category,
          location,
          price,
          holder: holder || null,
          status,
        },
      });

      return res.status(201).json(newItem);
    }

    if (req.method === "PUT") {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id) || id <= 0) {
        return sendError(res, 400, "Некорректный идентификатор");
      }

      const data: {
        name?: string;
        category?: string;
        location?: string;
        status?: string;
        holder?: string | null;
        price?: number | null;
      } = {};

      if (req.body?.name !== undefined) {
        const name = normalizeString(req.body.name);
        if (!name) {
          return sendError(res, 400, "Не заполнены обязательные поля");
        }
        data.name = name;
      }

      if (req.body?.category !== undefined) {
        const category = normalizeString(req.body.category);
        if (!category) {
          return sendError(res, 400, "Не заполнены обязательные поля");
        }
        data.category = category;
      }

      if (req.body?.location !== undefined) {
        const location = normalizeString(req.body.location);
        if (!location) {
          return sendError(res, 400, "Не заполнены обязательные поля");
        }
        data.location = location;
      }

      if (req.body?.status !== undefined) {
        data.status = normalizeString(req.body.status) || "На месте";
      }

      if (req.body?.holder !== undefined) {
        const holder = normalizeString(req.body.holder);
        data.holder = holder || null;
      }

      if (req.body?.price !== undefined) {
        data.price = parsePriceInput(req.body.price);
      }

      if (Object.keys(data).length === 0) {
        return sendError(res, 400, "Нет данных для обновления");
      }

      const updatedItem = await prisma.inventory.update({
        where: { id },
        data,
      });

      return res.status(200).json(updatedItem);
    }

    if (req.method === "DELETE") {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id) || id <= 0) {
        return sendError(res, 400, "Некорректный идентификатор");
      }

      await prisma.inventory.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return sendError(res, 405, "Метод не поддерживается");
  } catch (error) {
    console.error("inventory api error", error);
    return sendError(res, 500, "Не удалось выполнить запрос");
  }
}
