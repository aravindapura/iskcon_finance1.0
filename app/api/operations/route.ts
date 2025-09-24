import { NextResponse, type NextRequest } from "next/server";
import { Prisma, type Operation as PrismaOperation } from "@prisma/client";
import { ensureAccountant } from "@/lib/auth";
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

const applyExpenseToDebts = async (
  tx: Prisma.TransactionClient,
  operation: PrismaOperation,
  category: string
) => {
  const debts = await tx.debt.findMany({
    where: {
      status: "open",
      currency: operation.currency,
      OR: [
        {
          from_contact: {
            equals: category,
            mode: "insensitive"
          }
        },
        {
          to_contact: {
            equals: category,
            mode: "insensitive"
          }
        }
      ]
    },
    orderBy: { registered_at: "asc" }
  });

  if (debts.length === 0) {
    return;
  }

  let remainingPayment = new Prisma.Decimal(operation.amount);

  for (const debt of debts) {
    if (remainingPayment.lte(0)) {
      break;
    }

    const debtAmount = new Prisma.Decimal(debt.amount);
    const placeholderSource = `debt:${debt.id}`;
    const placeholder = await tx.operation.findFirst({
      where: { source: placeholderSource },
      orderBy: { occurred_at: "asc" }
    });

    const paymentToApply = remainingPayment.gte(debtAmount)
      ? debtAmount
      : remainingPayment;
    const updatedAmount = debtAmount.minus(paymentToApply);

    if (updatedAmount.lte(0)) {
      await tx.debt.delete({ where: { id: debt.id } });

      if (placeholder) {
        await tx.operation.delete({ where: { id: placeholder.id } });
      }
    } else {
      await tx.debt.update({
        where: { id: debt.id },
        data: { amount: updatedAmount }
      });

      if (placeholder) {
        await tx.operation.update({
          where: { id: placeholder.id },
          data: { amount: updatedAmount }
        });
      }
    }

    remainingPayment = remainingPayment.minus(paymentToApply);
  }
};

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

  const operation = await prisma.$transaction(async (tx) => {
    const created = await tx.operation.create({
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

    if (created.type === "expense") {
      await applyExpenseToDebts(tx, created, matchedCategory);
    }

    return created;
  });

  await recalculateGoalProgress();

  return NextResponse.json(serializeOperation(operation), { status: 201 });
};
