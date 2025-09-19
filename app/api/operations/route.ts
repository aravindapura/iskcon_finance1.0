import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import { getDefaultCategory, isValidCategory } from "@/lib/operationCategories";
import type { Operation } from "@/lib/types";

type OperationInput = {
  type: Operation["type"];
  amount: number;
  currency?: string;
  category?: Operation["category"];
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
    payload.amount <= 0
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const category = isValidCategory(payload.type, payload.category)
    ? payload.category
    : getDefaultCategory(payload.type);

  const operation: Operation = {
    id: crypto.randomUUID(),
    type: payload.type,
    amount: payload.amount,
    currency: payload.currency ?? "USD",
    category,
    comment: payload.comment,
    source: payload.source,
    date: new Date().toISOString()
  };

  db.operations.unshift(operation);

  return NextResponse.json(operation, { status: 201 });
};
