import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import { serializeOperation } from "@/lib/serializers";
import type { Currency, Operation } from "@/lib/types";

type TransactionType = "INCOME" | "EXPENSE";

type TransactionPayload = {
  walletId?: string;
  type?: TransactionType;
  amount?: number;
  date?: string;
  description?: string;
  category?: string;
  currency?: string;
};

const normalize = (value: string) => value.trim();

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const GET = async () => {
  const operations = await prisma.operation.findMany({
    orderBy: { occurred_at: "desc" },
    take: 50
  });

  return NextResponse.json({
    transactions: operations.map(serializeOperation)
  });
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as TransactionPayload | null;

  if (!payload) {
    return errorResponse("Некорректные данные запроса");
  }

  const { walletId, type, amount, date, description, category, currency } = payload;

  if (!walletId || typeof walletId !== "string" || !normalize(walletId)) {
    return errorResponse("Выберите кошелёк");
  }

  if (type !== "INCOME" && type !== "EXPENSE") {
    return errorResponse("Некорректный тип операции");
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return errorResponse("Введите сумму больше нуля");
  }

  if (typeof category !== "string" || !normalize(category)) {
    return errorResponse("Укажите категорию");
  }

  const wallet = await prisma.wallet.findUnique({ where: { wallet: normalize(walletId) } });

  if (!wallet) {
    return errorResponse("Кошелёк не найден");
  }

  const trimmedDescription =
    typeof description === "string" && normalize(description)
      ? normalize(description)
      : undefined;

  let occurredAt = new Date();

  if (typeof date === "string") {
    const parsed = new Date(date);

    if (!Number.isNaN(parsed.getTime())) {
      occurredAt = parsed;
    }
  }

  const sanitizedCurrency = sanitizeCurrency(
    currency,
    wallet.currency as Currency
  );

  const operation = await prisma.operation.create({
    data: {
      id: randomUUID(),
      type: type === "INCOME" ? "income" : "expense",
      amount,
      currency: sanitizedCurrency,
      category: normalize(category),
      wallet: wallet.display_name,
      comment: trimmedDescription ?? null,
      occurred_at: occurredAt
    }
  });

  return NextResponse.json(
    { transaction: serializeOperation(operation) },
    { status: 201 }
  );
};
