import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ErrorResponse = { error: string; details?: string };

type SuccessResponse = { success: true };

type BookListResponse = Awaited<ReturnType<typeof prisma.book.findMany>>;
type BookResponse = Awaited<ReturnType<typeof prisma.book.create>>;

type BookPayload = {
  title?: unknown;
  language?: unknown;
  quantity?: unknown;
  purchasePrice?: unknown;
  salePrice?: unknown;
  paid?: unknown;
  note?: unknown;
  id?: unknown;
};

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toFloat = (value: unknown) => {
  const parsed = Number.parseFloat(typeof value === "string" ? value : String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BookListResponse | BookResponse | SuccessResponse | ErrorResponse>,
) {
  try {
    if (req.method === "GET") {
      const books = await prisma.book.findMany();
      return res.status(200).json(books);
    }

    if (req.method === "POST") {
      const { title, language, quantity, purchasePrice, salePrice, paid, note } =
        (req.body ?? {}) as BookPayload;

      const normalizedTitle = normalizeString(title);
      const normalizedLanguage = normalizeString(language);

      if (!normalizedTitle || !normalizedLanguage) {
        return res.status(400).json({ error: "Название и язык обязательны" });
      }

      const q = toNumber(quantity);
      const buy = toFloat(purchasePrice);
      const sell = toFloat(salePrice);
      const pay = toFloat(paid);

      const newBook = await prisma.book.create({
        data: {
          title: normalizedTitle,
          language: normalizedLanguage,
          quantity: q,
          purchasePrice: buy,
          salePrice: sell,
          paid: pay,
          note: normalizeOptionalString(note),
        },
      });

      return res.status(201).json(newBook);
    }

    if (req.method === "PUT") {
      const { id, title, language, quantity, purchasePrice, salePrice, paid, note } =
        (req.body ?? {}) as BookPayload;

      const bookId = Number(id);
      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: "Некорректный идентификатор" });
      }

      const updateData: Record<string, unknown> = {};

      if (title !== undefined) {
        const normalizedTitle = normalizeString(title);
        if (!normalizedTitle) {
          return res.status(400).json({ error: "Название не может быть пустым" });
        }
        updateData.title = normalizedTitle;
      }

      if (language !== undefined) {
        const normalizedLanguage = normalizeString(language);
        if (!normalizedLanguage) {
          return res.status(400).json({ error: "Язык не может быть пустым" });
        }
        updateData.language = normalizedLanguage;
      }

      if (quantity !== undefined) {
        const q = Number(quantity);
        if (!Number.isFinite(q)) {
          return res.status(400).json({ error: "Некорректное количество" });
        }
        updateData.quantity = q;
      }

      if (purchasePrice !== undefined) {
        const value = Number.parseFloat(String(purchasePrice));
        if (!Number.isFinite(value)) {
          return res.status(400).json({ error: "Некорректная цена закупки" });
        }
        updateData.purchasePrice = value;
      }

      if (salePrice !== undefined) {
        const value = Number.parseFloat(String(salePrice));
        if (!Number.isFinite(value)) {
          return res.status(400).json({ error: "Некорректная цена реализации" });
        }
        updateData.salePrice = value;
      }

      if (paid !== undefined) {
        const value = Number.parseFloat(String(paid));
        if (!Number.isFinite(value)) {
          return res.status(400).json({ error: "Некорректная сумма оплаты" });
        }
        updateData.paid = value;
      }

      if (note !== undefined) {
        updateData.note = normalizeOptionalString(note);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "Нет данных для обновления" });
      }

      const updatedBook = await prisma.book.update({
        where: { id: bookId },
        data: updateData,
      });

      return res.status(200).json(updatedBook);
    }

    if (req.method === "DELETE") {
      const { id } = (req.body ?? {}) as BookPayload;
      const bookId = Number(id);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: "Некорректный идентификатор" });
      }

      await prisma.book.delete({ where: { id: bookId } });
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
