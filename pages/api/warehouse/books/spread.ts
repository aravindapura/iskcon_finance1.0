import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";

import { spreadBook } from "@/src/server/services/warehouseService";

type ErrorResponse = { error: string };

type BookResponse = Awaited<ReturnType<typeof spreadBook>>;

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
      console.error("books spread api: failed to parse body", error);
      return null;
    }
  }

  if (typeof body === "object") {
    return body as RawBody;
  }

  return null;
}

function parseSpread(body: RawBody): ParseResult<{ id: number; count: number }> {
  if (!body) {
    return { error: "Некорректные данные" };
  }

  const id = Number(body.id);
  const count = Number(body.count);

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Некорректный идентификатор" };
  }

  if (!Number.isInteger(count) || count <= 0) {
    return { error: "Количество должно быть положительным" };
  }

  return { data: { id, count } };
}

function sendError(res: NextApiResponse<ErrorResponse>, status: number, message: string) {
  res.status(status).json({ error: message });
}

function handlePrismaError(res: NextApiResponse<ErrorResponse>, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return sendError(res, 404, "Книга не найдена");
  }

  if (error instanceof Error && error.message === "Недостаточно книг") {
    return sendError(res, 400, error.message);
  }

  console.error("books spread api: unexpected error", error);
  return sendError(res, 500, "Не удалось распространить книгу");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BookResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  const result = parseSpread(ensureJsonBody(req.body));
  if ("error" in result) {
    return sendError(res, 400, result.error);
  }

  try {
    const updated = await spreadBook(result.data.id, result.data.count);
    return res.status(200).json(updated);
  } catch (error) {
    return handlePrismaError(res, error);
  }
}
