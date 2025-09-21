import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { ensureWalletDictionary } from "@/lib/bootstrap";
import { sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import { recalculateGoalProgress } from "@/lib/goals";
import { loadSettings } from "@/lib/settingsService";
import { serializeOperation } from "@/lib/serializers";
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

export const GET = async () => {
  const operations = await prisma.operation.findMany({
    orderBy: { occurred_at: "desc" }
  });

  return NextResponse.json(operations.map(serializeOperation));
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as OperationPayload | null;

  if (!payload) {
    return errorResponse("Некорректные данные", 400);
  }

  await ensureWalletDictionary();

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

  const trimmedWallet = normalizeValue(wallet);
  const matchedWallet = await prisma.wallet.findFirst({
    where: {
      display_name: {
        equals: trimmedWallet,
        mode: "insensitive"
      }
    }
  });

  if (!matchedWallet) {
    return errorResponse("Некорректный кошелёк", 400);
  }

  const trimmedCategory = normalizeValue(category);
  const storedCategory = await prisma.category.findFirst({
    where: {
      type,
      name: {
        equals: trimmedCategory,
        mode: "insensitive"
      }
    }
  });

  const matchedCategory = storedCategory?.name ?? trimmedCategory;

  const settings = await loadSettings();
  const sanitizedCurrency = sanitizeCurrency(currency, settings.baseCurrency);
  const trimmedComment =
    typeof comment === "string" && normalizeValue(comment) ? normalizeValue(comment) : undefined;
  const trimmedSource =
    typeof source === "string" && normalizeValue(source) ? normalizeValue(source) : undefined;

  const operation = await prisma.operation.create({
    data: {
      id: crypto.randomUUID(),
      type,
      amount,
      currency: sanitizedCurrency,
      category: matchedCategory,
      wallet: matchedWallet.display_name,
      comment: trimmedComment ?? null,
      source: trimmedSource ?? null,
      occurred_at: new Date()
    }
  });

  await recalculateGoalProgress();

  return NextResponse.json(serializeOperation(operation), { status: 201 });
};
