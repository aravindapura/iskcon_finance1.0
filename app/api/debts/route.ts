import { NextResponse, type NextRequest } from "next/server";
import { sanitizeCurrency } from "@/lib/currency";
import { db } from "@/lib/operationsStore";
import { WALLETS, isWallet, type Debt } from "@/lib/types";

type DebtInput = {
  type?: Debt["type"];
  amount?: number;
  from?: string;
  to?: string;
  comment?: string;
  currency?: Debt["currency"];
  wallet?: string;
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

  const currency = sanitizeCurrency(payload.currency, db.settings.baseCurrency);
  const wallet = isWallet(payload.wallet) ? payload.wallet : WALLETS[0];

  const debt: Debt = {
    id: crypto.randomUUID(),
    type: payload.type,
    amount: payload.amount,
    currency,
    status: "open",
    date: new Date().toISOString(),
    wallet,
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
