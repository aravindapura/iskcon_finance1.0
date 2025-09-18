import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import type { Operation } from "@/lib/types";

type OperationPayload = {
  type: Operation["type"];
  amount: number;
  currency?: string;
  category?: string;
  comment?: string;
  source?: string;
};

const isOperationType = (value: unknown): value is Operation["type"] =>
  value === "income" || value === "expense";

export const GET = () => NextResponse.json(db.operations);

export const POST = async (request: NextRequest) => {
  let data: unknown;

  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof data !== "object" || data === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = data as Partial<OperationPayload>;

  if (!isOperationType(payload.type) || typeof payload.amount !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }

  const currency =
    typeof payload.currency === "string" && payload.currency.trim().length > 0
      ? payload.currency.trim()
      : "USD";

  const category =
    typeof payload.category === "string" && payload.category.trim().length > 0
      ? payload.category.trim()
      : "general";

  const comment =
    typeof payload.comment === "string" && payload.comment.trim().length > 0
      ? payload.comment.trim()
      : undefined;

  const source =
    typeof payload.source === "string" && payload.source.trim().length > 0
      ? payload.source.trim()
      : undefined;

  const operation: Operation = {
    id: crypto.randomUUID(),
    type: payload.type,
    amount: payload.amount,
    currency,
    category,
    comment,
    source,
    date: new Date().toISOString()
  };

  db.operations.unshift(operation);

  return NextResponse.json(operation, { status: 201 });
};
