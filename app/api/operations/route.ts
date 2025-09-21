import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { sanitizeCurrency } from "@/lib/currency";
import { db, recalculateGoalProgress } from "@/lib/operationsStore";
import type { Operation } from "@/lib/types";

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

  if (db.wallets.length === 0) {
    return NextResponse.json(
      { error: "Нет доступных кошельков для операции" },
      { status: 400 }
    );
  }

  const rawWallet = typeof payload.wallet === "string" ? payload.wallet.trim() : "";

  if (!rawWallet) {
    return NextResponse.json({ error: "Укажите кошелёк" }, { status: 400 });
  }

  const wallet = db.wallets.find(
    (stored) => stored.toLowerCase() === rawWallet.toLowerCase()
  );

  if (!wallet) {
    return NextResponse.json({ error: "Некорректный кошелёк" }, { status: 400 });
  }

  const currency = sanitizeCurrency(payload.currency, db.settings.baseCurrency);

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
