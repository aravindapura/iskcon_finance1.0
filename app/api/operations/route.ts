import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import { convertBetweenCurrencies, convertToUsd, isSupportedCurrency } from "@/lib/rates";
import type { Operation } from "@/lib/types";

const roundMoney = (value: number) => Number(value.toFixed(2));

const DEFAULT_CURRENCY: Operation["currency"] = "USD";

type OperationInput = {
  type: Operation["type"];
  amount: number;
  currency?: string;
  category?: string;
  comment?: string;
  source?: string;
};

export const GET = () => NextResponse.json(db.operations);

export const POST = async (request: NextRequest) => {
  const payload = (await request.json()) as Partial<OperationInput> | null;

  if (
    !payload ||
    (payload.type !== "income" && payload.type !== "expense") ||
    typeof payload.amount !== "number" ||
    !Number.isFinite(payload.amount) ||
    payload.amount <= 0
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const sanitizedCategory =
    typeof payload.category === "string" && payload.category.trim().length > 0
      ? payload.category.trim()
      : "прочее";

  const currency =
    typeof payload.currency === "string" && isSupportedCurrency(payload.currency)
      ? payload.currency
      : DEFAULT_CURRENCY;

  const amountUsd = convertToUsd(payload.amount, currency);

  const operation: Operation = {
    id: crypto.randomUUID(),
    type: payload.type,
    amount: roundMoney(payload.amount),
    currency,
    amountUsd,
    category: sanitizedCategory,
    comment: payload.comment,
    source: payload.source,
    date: new Date().toISOString()
  };

  db.operations.unshift(operation);

  if (operation.type === "expense") {
    const matchedGoal = db.goals.find(
      (goal) => goal.title.toLowerCase() === operation.category.toLowerCase()
    );

    if (matchedGoal) {
      const convertedAmount = convertBetweenCurrencies(
        operation.amount,
        operation.currency,
        matchedGoal.targetCurrency
      );

      matchedGoal.currentAmount = roundMoney(
        matchedGoal.currentAmount + convertedAmount
      );
      matchedGoal.currentAmountUsd = roundMoney(
        matchedGoal.currentAmountUsd + operation.amountUsd
      );

      if (matchedGoal.currentAmountUsd >= matchedGoal.targetAmountUsd) {
        matchedGoal.status = "done";
      }
    }
  }

  return NextResponse.json(operation, { status: 201 });
};
