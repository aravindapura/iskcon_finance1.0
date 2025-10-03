import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ensureAccountant } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { recalculateGoalProgress } from "@/lib/goals";
import { serializeOperation } from "@/lib/serializers";
import { extractDebtAdjustments, type StoredDebtAdjustment } from "@/lib/debtPayments";

const restoreDebtAdjustments = async (
  tx: Prisma.TransactionClient,
  adjustments: StoredDebtAdjustment[]
) => {
  for (const adjustment of adjustments) {
    const amountBefore = new Prisma.Decimal(adjustment.amountBefore);
    const amountAfter =
      typeof adjustment.amountAfter === "string" && adjustment.amountAfter.trim().length > 0
        ? new Prisma.Decimal(adjustment.amountAfter)
        : null;
    const delta = amountAfter ? amountBefore.minus(amountAfter) : amountBefore;

    const existingDebt = await tx.debt.findUnique({ where: { id: adjustment.id } });

    if (existingDebt) {
      const currentAmount = new Prisma.Decimal(existingDebt.amount);
      const restoredAmount = currentAmount.plus(delta);

      await tx.debt.update({
        where: { id: adjustment.id },
        data: {
          amount: restoredAmount,
          status: adjustment.status
        }
      });

      continue;
    }

    const registeredAt = new Date(adjustment.registered_at);
    const normalizedRegisteredAt = Number.isNaN(registeredAt.getTime())
      ? new Date()
      : registeredAt;

    await tx.debt.create({
      data: {
        id: adjustment.id,
        type: adjustment.type,
        status: adjustment.status,
        amount: amountBefore,
        currency: adjustment.currency,
        wallet: adjustment.wallet,
        from_contact: adjustment.from_contact ?? null,
        to_contact: adjustment.to_contact ?? null,
        comment: adjustment.comment ?? null,
        registered_at: normalizedRegisteredAt
      }
    });
  }
};

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

  await prisma.$transaction(async (tx) => {
    await tx.operation.delete({ where: { id } });

    if (existing.type === "expense") {
      const adjustments = extractDebtAdjustments(existing.source);

      if (adjustments.length > 0) {
        await restoreDebtAdjustments(tx, adjustments);
      }
    }
  });
  await recalculateGoalProgress();

  return NextResponse.json(serializeOperation(existing));
};
