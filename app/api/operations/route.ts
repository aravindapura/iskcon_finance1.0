import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { sanitizeCurrency } from "@/lib/currency";
import { db, recalculateGoalProgress } from "@/lib/operationsStore";
import type { Operation } from "@/lib/types";

type OperationPayload = {
  type?: Operation["type"];
  amount?: number;
  currency?: string;
  category?: string;
  wallet?: string;
  comment?: string | null;
  source?: string | null;
};

const normalizeValue = (value: string) => value.trim();

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

export const GET = () => NextResponse.json(db.operations);

export const POST = async (request: NextRequest) => {
  const auth = ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as OperationPayload | null;

  if (!payload) {
    return errorResponse("Некорректные данные", 400);
  }

  const { type, amount, currency, category, wallet, comment, source } = payload;

  if (type !== "income" && type !== "expense") {
    return errorResponse("Некорректный тип операции", 400);
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return errorResponse("Введите корректную сумму", 400);
  }

  if (typeof category !== "string" || !normalizeValue(category)) {
    return errorResponse("Укажите категорию", 400);
  }

  if (typeof wallet !== "string" || !normalizeValue(wallet)) {
    return errorResponse("Укажите кошелёк", 400);
  }

  const normalizedWallet = normalizeValue(wallet).toLowerCase();
  const matchedWallet = db.wallets.find(
    (stored) => normalizeValue(stored).toLowerCase() === normalizedWallet
  );

  if (!matchedWallet) {
    return errorResponse("Некорректный кошелёк", 400);
  }

  const trimmedCategory = normalizeValue(category);
  const categoryList =
    type === "income" ? db.categories.income : db.categories.expense;
  const matchedCategory =
    categoryList.find(
      (item) => normalizeValue(item).toLowerCase() === trimmedCategory.toLowerCase()
    ) ?? trimmedCategory;

  const sanitizedCurrency = sanitizeCurrency(currency, db.settings.baseCurrency);
  const trimmedComment =
    typeof comment === "string" && normalizeValue(comment) ? normalizeValue(comment) : undefined;
  const trimmedSource =
    typeof source === "string" && normalizeValue(source) ? normalizeValue(source) : undefined;

  const operation: Operation = {
    id: crypto.randomUUID(),
    type,
    amount,
    currency: sanitizedCurrency,
    category: matchedCategory,
    wallet: matchedWallet,
    comment: trimmedComment,
    source: trimmedSource,
    date: new Date().toISOString()
  };

  db.operations.unshift(operation);
  recalculateGoalProgress();

  return NextResponse.json(operation, { status: 201 });
};
