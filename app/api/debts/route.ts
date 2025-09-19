import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import { convertToUsd, isSupportedCurrency } from "@/lib/rates";
import type { Debt } from "@/lib/types";

const roundMoney = (value: number) => Number(value.toFixed(2));

const DEFAULT_CURRENCY: Debt["currency"] = "USD";

type DebtInput = {
  type?: Debt["type"];
  amount?: number;
  currency?: string;
  from?: string;
  to?: string;
  comment?: string;
};

export const GET = () => NextResponse.json(db.debts);

export const POST = async (request: NextRequest) => {
  const payload = (await request.json()) as DebtInput | null;

  if (!payload || (payload.type !== "borrowed" && payload.type !== "lent")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (typeof payload.amount !== "number" || !Number.isFinite(payload.amount) || payload.amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (payload.type === "borrowed" && (!payload.from || typeof payload.from !== "string")) {
    return NextResponse.json({ error: "Debt requires a lender" }, { status: 400 });
  }

  if (payload.type === "lent" && (!payload.to || typeof payload.to !== "string")) {
    return NextResponse.json({ error: "Debt requires a recipient" }, { status: 400 });
  }

  const currency =
    typeof payload.currency === "string" && isSupportedCurrency(payload.currency)
      ? payload.currency
      : DEFAULT_CURRENCY;

  const amountUsd = convertToUsd(payload.amount, currency);

  const debt: Debt = {
    id: crypto.randomUUID(),
    type: payload.type,
    amount: roundMoney(payload.amount),
    currency,
    amountUsd,
    status: "open",
    date: new Date().toISOString(),
    from: payload.type === "borrowed" ? payload.from : undefined,
    to: payload.type === "lent" ? payload.to : undefined,
    comment: payload.comment?.trim() ? payload.comment.trim() : undefined
  };

  db.debts.unshift(debt);

  return NextResponse.json(debt, { status: 201 });
};

export const DELETE = (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Debt id is required" }, { status: 400 });
  }

  const index = db.debts.findIndex((debt) => debt.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Debt not found" }, { status: 404 });
  }

  db.debts.splice(index, 1);

  return NextResponse.json({ success: true });
};
