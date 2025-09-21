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
  const goalIndex = db.goals.findIndex((goal) => goal.id === id);

  if (goalIndex === -1) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const [deletedGoal] = db.goals.splice(goalIndex, 1);
  let removedOperationsCount = 0;
  const goalTitle = deletedGoal.title.trim().toLowerCase();

  for (let index = db.operations.length - 1; index >= 0; index -= 1) {
    const operation = db.operations[index];
    const operationCategory = operation.category.trim().toLowerCase();

    if (operationCategory === goalTitle) {
      removedOperationsCount += 1;
      db.operations.splice(index, 1);
    }
  }

  recalculateGoalProgress();

  return NextResponse.json({
    goal: deletedGoal,
    removedOperationsCount
  });
};
