import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { ensureGoalsSchema, ensureOperationsSchema } from "@/lib/bootstrap";
import prisma from "@/lib/prisma";
import { recalculateGoalProgress } from "@/lib/goals";
import { serializeGoal } from "@/lib/serializers";

export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  await ensureGoalsSchema();
  await ensureOperationsSchema();

  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const { id } = params;
  const goal = await prisma.goal.findUnique({ where: { id } });

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const removedOperations = await prisma.operation.deleteMany({
    where: {
      type: "expense",
      category: {
        equals: goal.title,
        mode: "insensitive"
      }
    }
  });

  await prisma.goal.delete({ where: { id } });
  await recalculateGoalProgress();

  return NextResponse.json({
    goal: serializeGoal(goal),
    removedOperationsCount: removedOperations.count
  });
};
