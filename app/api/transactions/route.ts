import { NextResponse, type NextRequest } from "next/server";
import { Prisma, type Operation as PrismaOperation } from "@prisma/client";

import { ensureAccountant } from "@/lib/auth";
import { sanitizeCurrency } from "@/lib/currency";
import { appendDebtPaymentSource } from "@/lib/debtPayments";
import prisma from "@/lib/prisma";
import { recalculateGoalProgress } from "@/lib/goals";
import { loadSettings } from "@/lib/settingsService";
import { serializeOperation } from "@/lib/serializers";

const normalize = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

type TransactionPayload = {
  walletId?: string;
  type?: "INCOME" | "EXPENSE";
  amount?: number;
  date?: string;
  description?: string;
  sourceOrCategory?: string;
};

const toOperationType = (type: TransactionPayload["type"]) => {
  if (type === "INCOME") {
    return "income" as const;
  }

  if (type === "EXPENSE") {
    return "expense" as const;
  }

  return null;
};

const parseDateValue = (value: string | undefined) => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const applyExpenseToDebts = async (
  tx: Prisma.TransactionClient,
  operation: PrismaOperation,
  category: string
) => {
  if (operation.type !== "expense") {
    return new Prisma.Decimal(0);
  }

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
    return new Prisma.Decimal(0);
  }

  const originalAmount = new Prisma.Decimal(operation.amount);
  let remainingPayment = new Prisma.Decimal(operation.amount);

  for (const debt of debts) {
    if (remainingPayment.lte(0)) {
      break;
    }

    const debtAmount = new Prisma.Decimal(debt.amount);
    const placeholderSource = `debt:${debt.id}`;

    const paymentToApply = remainingPayment.gte(debtAmount)
      ? debtAmount
      : remainingPayment;
    const updatedAmount = debtAmount.minus(paymentToApply);

    if (updatedAmount.lte(0)) {
      await tx.debt.delete({ where: { id: debt.id } });
    } else {
      await tx.debt.update({
        where: { id: debt.id },
        data: { amount: updatedAmount }
      });
    }

    await tx.operation.deleteMany({ where: { source: placeholderSource } });

    remainingPayment = remainingPayment.minus(paymentToApply);
  }

  return originalAmount.minus(remainingPayment);
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as TransactionPayload | null;

  if (!payload) {
    return errorResponse("Некорректные данные");
  }

  const walletId = normalize(payload.walletId);

  if (!walletId) {
    return errorResponse("Укажите кошелёк");
  }

  const operationType = toOperationType(payload.type);

  if (!operationType) {
    return errorResponse("Некорректный тип транзакции");
  }

  if (typeof payload.amount !== "number" || !Number.isFinite(payload.amount) || payload.amount <= 0) {
    return errorResponse("Введите корректную сумму");
  }

  const category = normalize(payload.sourceOrCategory);

  if (!category) {
    return errorResponse(
      operationType === "income"
        ? "Выберите источник дохода"
        : "Выберите категорию расхода"
    );
  }

  const occurredAt = parseDateValue(payload.date);

  if (!occurredAt) {
    return errorResponse("Укажите корректную дату");
  }

  const wallet = await prisma.wallet.findUnique({ where: { wallet: walletId } });

  if (!wallet) {
    return errorResponse("Кошелёк не найден", 404);
  }

  const settings = await loadSettings();
  const currency = sanitizeCurrency(wallet.currency, settings.baseCurrency);
  const comment = normalize(payload.description);

  const operation = await prisma.$transaction(async (tx) => {
    let created = await tx.operation.create({
      data: {
        id: crypto.randomUUID(),
        type: operationType,
        amount: payload.amount,
        currency,
        category,
        wallet: wallet.display_name,
        comment: comment || null,
        source: operationType === "income" ? category : null,
        occurred_at: occurredAt
      }
    });

    if (created.type === "expense") {
      const appliedAmount = await applyExpenseToDebts(tx, created, category);

      if (appliedAmount.gt(0)) {
        const updatedSource = appendDebtPaymentSource(created.source, appliedAmount.toString());

        created = await tx.operation.update({
          where: { id: created.id },
          data: { source: updatedSource || null }
        });
      }
    }

    return created;
  });

  await recalculateGoalProgress();

  return NextResponse.json(
    { transaction: serializeOperation(operation) },
    { status: 201 }
  );
};
