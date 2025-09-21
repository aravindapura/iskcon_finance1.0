import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { sanitizeCurrency } from "@/lib/currency";
import { db, recalculateGoalProgress } from "@/lib/operationsStore";
import { WALLETS, isWallet, type Operation } from "@/lib/types";

type OperationInput = {
  type: Operation["type"];
  amount: number;
  currency?: string;
  category?: string;
  comment?: string;
  source?: string;
  wallet?: string;
};

export const GET = () => NextResponse.json(db.operations);

export const POST = async (request: NextRequest) => {
  const auth = ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json()) as Partial<OperationInput> | null;

  if (
    !payload ||
    (payload.type !== "income" && payload.type !== "expense") ||
    typeof payload.amount !== "number"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const sanitizedCategory =
    typeof payload.category === "string" && payload.category.trim().length > 0
      ? payload.category.trim()
      : "прочее";

  const currency = sanitizeCurrency(payload.currency, db.settings.baseCurrency);
  const wallet = isWallet(payload.wallet) ? payload.wallet : WALLETS[0];

  const operation: Operation = {
    id: crypto.randomUUID(),
    type: payload.type,
    amount: payload.amount,
    currency,
    category: sanitizedCategory,
    wallet,
    comment: payload.comment,
    source: payload.source,
    date: new Date().toISOString()
  };

  db.operations.unshift(operation);
  recalculateGoalProgress();

  return NextResponse.json(operation, { status: 201 });
};
