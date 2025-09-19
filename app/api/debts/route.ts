import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import type { Debt } from "@/lib/types";

type DebtInput = {
  type?: Debt["type"];
  amount?: number;
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

  const debt: Debt = {
    id: crypto.randomUUID(),
    type: payload.type,
    amount: payload.amount,
    status: "open",
    date: new Date().toISOString(),
    from: payload.type === "borrowed" ? payload.from : undefined,
    to: payload.type === "lent" ? payload.to : undefined,
    comment: payload.comment?.trim() ? payload.comment.trim() : undefined
  };

  db.debts.unshift(debt);

  return NextResponse.json(debt, { status: 201 });
};
