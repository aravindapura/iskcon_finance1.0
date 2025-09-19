import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import type { Debt } from "@/lib/types";

const isValidAmount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isValidDirection = (value: unknown): value is Debt["direction"] =>
  value === "outgoing" || value === "incoming";

export const GET = () => {
  return NextResponse.json(db.debts);
};

export const POST = async (request: NextRequest) => {
  const payload = (await request.json()) as
    | Partial<Pick<Debt, "name" | "amount" | "comment" | "direction">>
    | null;

  if (
    !payload ||
    !isValidAmount(payload.amount) ||
    !isNonEmptyString(payload.name) ||
    !isValidDirection(payload.direction)
  ) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  const debt: Debt = {
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    direction: payload.direction,
    amount: payload.amount,
    status: "open",
    date: new Date().toISOString(),
    comment: payload.comment?.trim() ? payload.comment.trim() : undefined
  };

  db.debts.unshift(debt);

  return NextResponse.json(debt, { status: 201 });
};

export const PUT = async (request: NextRequest) => {
  const payload = (await request.json()) as { id?: string; action?: string } | null;

  if (!payload?.id) {
    return NextResponse.json({ error: "Debt id is required" }, { status: 400 });
  }

  if (payload.action !== "close") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const debt = db.debts.find((item) => item.id === payload.id);

  if (!debt) {
    return NextResponse.json({ error: "Debt not found" }, { status: 404 });
  }

  debt.status = "closed";

  return NextResponse.json(debt, { status: 200 });
};
