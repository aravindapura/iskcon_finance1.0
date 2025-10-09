import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";

import {
  createBook,
  deleteBook,
  getAllBooks,
  updateBook,
} from "@/src/server/services/warehouseService";

type ErrorResponse = { error: string };

type BooksResponse = Awaited<ReturnType<typeof getAllBooks>>;
type BookResponse = Awaited<ReturnType<typeof createBook>>;

type BookPayload = {
  title: string;
  language: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  paid: number;
  note: string | null;
};

type BookUpdatePayload = Partial<BookPayload> & { title?: string; language?: string };

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
      console.error("books api: failed to parse body", error);
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

function parseBookCreate(body: RawBody): ParseResult<BookPayload> {
  if (!body) {
    return { error: "Некорректные данные" };
  }

  const title = normalizeString(body.title);
  const language = normalizeString(body.language);
  const quantity = Number(body.quantity);
  const purchasePrice = Number.parseFloat(String(body.purchasePrice ?? ""));
  const salePrice = Number.parseFloat(String(body.salePrice ?? ""));
  const paid = Number.parseFloat(String(body.paid ?? ""));
  const noteValue = normalizeString(body.note);

  if (!title || !language) {
    return { error: "Необходимо указать название и язык" };
  }

  if (
    Number.isNaN(quantity) ||
    Number.isNaN(purchasePrice) ||
    Number.isNaN(salePrice) ||
    Number.isNaN(paid)
  ) {
    return { error: "Некорректные числовые значения" };
  }

  return {
    data: {
      title,
      language,
      quantity,
      purchasePrice,
      salePrice,
      paid,
      note: noteValue ? noteValue : null,
    },
  };
}

function parseBookUpdate(body: RawBody): ParseResult<{ id: number; data: BookUpdatePayload }> {
  if (!body) {
    return { error: "Некорректные данные" };
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Некорректный идентификатор" };
  }

  const data: BookUpdatePayload = {};

  if (body.title !== undefined) {
    const title = normalizeString(body.title);
    if (!title) {
      return { error: "Название не может быть пустым" };
    }
    data.title = title;
  }

  if (body.language !== undefined) {
    const language = normalizeString(body.language);
    if (!language) {
      return { error: "Язык не может быть пустым" };
    }
    data.language = language;
  }

  if (body.quantity !== undefined) {
    const quantity = Number(body.quantity);
    if (Number.isNaN(quantity)) {
      return { error: "Некорректное количество" };
    }
    data.quantity = quantity;
  }

  if (body.purchasePrice !== undefined) {
    const purchasePrice = Number.parseFloat(String(body.purchasePrice));
    if (Number.isNaN(purchasePrice)) {
      return { error: "Некорректная цена закупки" };
    }
    data.purchasePrice = purchasePrice;
  }

  if (body.salePrice !== undefined) {
    const salePrice = Number.parseFloat(String(body.salePrice));
    if (Number.isNaN(salePrice)) {
      return { error: "Некорректная цена реализации" };
    }
    data.salePrice = salePrice;
  }

  if (body.paid !== undefined) {
    const paid = Number.parseFloat(String(body.paid));
    if (Number.isNaN(paid)) {
      return { error: "Некорректная оплаченная сумма" };
    }
    data.paid = paid;
  }

  if (body.note !== undefined) {
    const noteValue = normalizeString(body.note);
    data.note = noteValue ? noteValue : null;
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

  console.error("books api: unexpected error", error);
  return sendError(res, 500, "Не удалось выполнить запрос");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BooksResponse | BookResponse | { success: true } | ErrorResponse>,
) {
  if (req.method === "GET") {
    try {
      const books = await getAllBooks();
      return res.status(200).json(books);
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  if (req.method === "POST") {
    const result = parseBookCreate(ensureJsonBody(req.body));
    if ("error" in result) {
      return sendError(res, 400, result.error);
    }

    try {
      const created = await createBook(result.data);
      return res.status(201).json(created);
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  if (req.method === "PUT") {
    const result = parseBookUpdate(ensureJsonBody(req.body));
    if ("error" in result) {
      return sendError(res, 400, result.error);
    }

    try {
      const updated = await updateBook(result.data.id, result.data.data);
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
      await deleteBook(result.data);
      return res.status(200).json({ success: true });
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  res.setHeader("Allow", "GET,POST,PUT,DELETE");
  return res.status(405).json({ error: "Метод не поддерживается" });
}
