import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import type { Operation } from "@/lib/types";

type OperationInput = {
  type: Operation["type"];
  amount: number;
  currency?: string;
  category?: string;
  comment?: string;
  source?: string;
};

export const GET = () => {
  return NextResponse.json(db.operations);
};

export const POST = async (request: NextRequest) => {
  const payload = (await request.json()) as Partial<OperationInput>;

  if (
    !payload ||
    (payload.type !== "income" && payload.type !== "expense") ||
    typeof payload.amount !== "number"
  ) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  const operation: Operation = {
    id: crypto.randomUUID(),
    type: payload.type,
    amount: payload.amount,
    currency: payload.currency ?? "USD",
    category: payload.category ?? "general",
    comment: payload.comment,
    source: payload.source,
    date: new Date().toISOString()
  };

  db.operations.unshift(operation);

  return NextResponse.json(operation, { status: 201 });
};
