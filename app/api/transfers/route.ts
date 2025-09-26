import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { convertFromBase, convertToBase, sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import { serializeDebt, serializeGoal, serializeOperation } from "@/lib/serializers";
import { loadSettings } from "@/lib/settingsService";
import { buildWalletBalanceMap, getWalletBalance } from "@/lib/walletsSummary";

type TransferPayload = {
  fromWallet?: string;
  toWallet?: string;
  amount?: number;
  fromCurrency?: string;
  toCurrency?: string;
  comment?: string;
};

const normalizeValue = (value: string) => value.trim();

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as TransferPayload | null;

  if (!payload) {
    return errorResponse("Некорректные данные", 400);
  }

  const { fromWallet, toWallet, amount, fromCurrency, toCurrency, comment } = payload;

  if (typeof fromWallet !== "string" || !normalizeValue(fromWallet)) {
    return errorResponse("Укажите исходный кошелёк", 400);
  }

  if (typeof toWallet !== "string" || !normalizeValue(toWallet)) {
    return errorResponse("Укажите целевой кошелёк", 400);
  }

  const normalizedFrom = normalizeValue(fromWallet);
  const normalizedTo = normalizeValue(toWallet);

  if (normalizedFrom.toLowerCase() === normalizedTo.toLowerCase()) {
    return errorResponse("Выберите разные кошельки", 400);
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return errorResponse("Введите сумму перевода", 400);
  }

  const [fromWalletRecord, toWalletRecord] = await Promise.all([
    prisma.wallet.findFirst({
      where: {
        display_name: {
          equals: normalizedFrom,
          mode: "insensitive"
        }
      }
    }),
    prisma.wallet.findFirst({
      where: {
        display_name: {
          equals: normalizedTo,
          mode: "insensitive"
        }
      }
    })
  ]);

  if (!fromWalletRecord) {
    return errorResponse("Исходный кошелёк не найден", 404);
  }

  if (!toWalletRecord) {
    return errorResponse("Целевой кошелёк не найден", 404);
  }

  const settings = await loadSettings();
  const sanitizedFromCurrency = sanitizeCurrency(fromCurrency, settings.baseCurrency);
  const sanitizedToCurrency = sanitizeCurrency(toCurrency, settings.baseCurrency);

  const [walletOperations, walletDebts, walletGoals] = await Promise.all([
    prisma.operation.findMany({
      where: {
        wallet: {
          equals: fromWalletRecord.display_name,
          mode: "insensitive"
        }
      }
    }),
    prisma.debt.findMany({
      where: {
        wallet: {
          equals: fromWalletRecord.display_name,
          mode: "insensitive"
        }
      }
    }),
    prisma.goal.findMany()
  ]);

  const walletBalances = buildWalletBalanceMap({
    walletNames: [fromWalletRecord.display_name],
    operations: walletOperations.map(serializeOperation),
    debts: walletDebts.map(serializeDebt),
    goals: walletGoals.map(serializeGoal),
    settings
  });

  const walletBalance = getWalletBalance(walletBalances, fromWalletRecord.display_name);
  const availableAmount = walletBalance?.byCurrency[sanitizedFromCurrency] ?? 0;

  if (availableAmount - amount < -0.009) {
    const formatter = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: sanitizedFromCurrency
    });

    return errorResponse(
      `Недостаточно средств в кошельке. Доступно ${formatter.format(Math.max(0, availableAmount))}`,
      400
    );
  }

  const amountInBase = convertToBase(amount, sanitizedFromCurrency, settings);
  const convertedAmountRaw = convertFromBase(amountInBase, sanitizedToCurrency, settings);
  const convertedAmount = Math.round(convertedAmountRaw * 100) / 100;

  const trimmedComment =
    typeof comment === "string" && normalizeValue(comment) ? normalizeValue(comment) : undefined;

  const transferId = crypto.randomUUID();
  const occurredAt = new Date();
  const transferCategory = "Перевод между кошельками";

  const [expenseOperation, incomeOperation] = await prisma.$transaction(async (tx) => {
    const expense = await tx.operation.create({
      data: {
        id: crypto.randomUUID(),
        type: "expense",
        amount,
        currency: sanitizedFromCurrency,
        category: transferCategory,
        wallet: fromWalletRecord.display_name,
        comment: trimmedComment ?? `Перевод в ${toWalletRecord.display_name}`,
        source: `transfer:${transferId}`,
        occurred_at: occurredAt
      }
    });

    const income = await tx.operation.create({
      data: {
        id: crypto.randomUUID(),
        type: "income",
        amount: convertedAmount,
        currency: sanitizedToCurrency,
        category: transferCategory,
        wallet: toWalletRecord.display_name,
        comment: trimmedComment ?? `Перевод из ${fromWalletRecord.display_name}`,
        source: `transfer:${transferId}`,
        occurred_at: occurredAt
      }
    });

    return [expense, income];
  });

  return NextResponse.json(
    {
      expense: serializeOperation(expenseOperation),
      income: serializeOperation(incomeOperation),
      convertedAmount
    },
    { status: 201 }
  );
};
