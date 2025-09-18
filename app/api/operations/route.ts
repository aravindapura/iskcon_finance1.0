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
  return Response.json(db.operations);
};

export const POST = async (request: Request) => {
  const payload = (await request.json()) as Partial<OperationInput> | null;

  if (
    !payload ||
    (payload.type !== "income" && payload.type !== "expense") ||
    typeof payload.amount !== "number"
  ) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
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

  return Response.json(operation, { status: 201 });
};
