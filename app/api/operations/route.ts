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

export const GET = () => NextResponse.json(db.operations);

export const POST = async (request: NextRequest) => {
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

  const operation: Operation = {
    id: crypto.randomUUID(),
    type: payload.type,
    amount: payload.amount,
    currency: payload.currency ?? "USD",
    category: sanitizedCategory,
    comment: payload.comment,
    source: payload.source,
    date: new Date().toISOString()
  };

  db.operations.unshift(operation);

  if (operation.type === "expense") {
    const matchedGoal = db.goals.find(
      (goal) => goal.title.toLowerCase() === operation.category.toLowerCase()
    );

    if (matchedGoal) {
      matchedGoal.currentAmount += operation.amount;

      if (matchedGoal.currentAmount >= matchedGoal.targetAmount) {
        matchedGoal.status = "done";
      }
    }
  }

  return NextResponse.json(operation, { status: 201 });
};
