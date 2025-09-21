import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { recalculateGoalProgress } from "@/lib/goals";
import { serializeOperation } from "@/lib/serializers";

export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const { id } = params;
  const existing = await prisma.operation.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  }

  await prisma.operation.delete({ where: { id } });
  await recalculateGoalProgress();

  return NextResponse.json(serializeOperation(existing));
};
