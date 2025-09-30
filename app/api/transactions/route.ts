import { NextResponse, type NextRequest } from "next/server";
import { Prisma, type Operation as PrismaOperation } from "@prisma/client";

import { ensureAccountant } from "@/lib/auth";
import { sanitizeCurrency } from "@/lib/currency";
import { appendDebtPaymentSource } from "@/lib/debtPayments";
import { recalculateGoalProgress } from "@/lib/goals";
import prisma from "@/lib/prisma";
import { serializeOperation } from "@/lib/serializers";
import { loadSettings } from "@/lib/settingsService";

const normalize = (value: string | null | undefined) => value?.trim() ?? "";

const errorResponse = (message: string, status = 400) =>
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

    const paymentToApply = remainingPayment.gte(debtAmount) ? debtAmount : remainingPayment;
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

type TransactionPayload = {
  walletId?: string;
  type?: "INCOME" | "EXPENSE";
  amount?: number;
  source?: string | null;
  category?: string | null;
  description?: string | null;
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as TransactionPayload | null;

  if (!payload) {
    return errorResponse("Некорректные данные", 400);
  }

  const { walletId, type, amount, source, category, description } = payload;

  if (!walletId || typeof walletId !== "string") {
    return errorResponse("Укажите кошелёк", 400);
  }

  if (type !== "INCOME" && type !== "EXPENSE") {
    return errorResponse("Некорректный тип операции", 400);
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return errorResponse("Введите корректную сумму", 400);
  }

  const trimmedSource = normalize(source);
  const trimmedCategory = normalize(category);
  const trimmedDescription = normalize(description);

  if (type === "EXPENSE" && !trimmedCategory) {
    return errorResponse("Укажите категорию расхода", 400);
  }

  if (type === "INCOME" && !trimmedSource) {
    return errorResponse("Выберите источник дохода", 400);
  }

  const wallet = await prisma.wallet.findUnique({ where: { wallet: walletId } });

  if (!wallet) {
    return errorResponse("Кошелёк не найден", 404);
  }

  const settings = await loadSettings();
  const currency = sanitizeCurrency(wallet.currency, settings.baseCurrency);
  const operationType = type === "INCOME" ? "income" : "expense";
  const categoryValue =
    operationType === "expense" ? trimmedCategory : trimmedSource || wallet.display_name;

  try {
    const operation = await prisma.$transaction(async (tx) => {
      let created = await tx.operation.create({
        data: {
          id: crypto.randomUUID(),
          type: operationType,
          amount,
          currency,
          category: categoryValue,
          wallet: wallet.display_name,
          comment: trimmedDescription ? trimmedDescription : null,
          source: type === "INCOME" ? trimmedSource : null,
          occurred_at: new Date()
        }
      });

      if (created.type === "expense") {
        const appliedAmount = await applyExpenseToDebts(tx, created, categoryValue);

        if (appliedAmount.gt(0)) {
          const updatedSource = appendDebtPaymentSource(null, appliedAmount.toString());

          created = await tx.operation.update({
            where: { id: created.id },
            data: { source: updatedSource || null }
          });
        }
      }

      return created;
    });

    await recalculateGoalProgress();

    return NextResponse.json(serializeOperation(operation), { status: 201 });
  } catch (error) {
    console.error("Failed to create transaction", error);
    return errorResponse("Не удалось сохранить операцию", 500);
  }
};
