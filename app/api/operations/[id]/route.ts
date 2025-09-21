import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { db, recalculateGoalProgress } from "@/lib/operationsStore";

export const DELETE = (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const auth = ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const { id } = params;
  const index = db.operations.findIndex((operation) => operation.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  }

  const [deleted] = db.operations.splice(index, 1);

  recalculateGoalProgress();

  return NextResponse.json(deleted);
};
