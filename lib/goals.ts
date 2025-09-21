import { Prisma } from "@prisma/client";
import { ensureGoalsSchema, ensureOperationsSchema } from "@/lib/bootstrap";
import { convertToBase } from "@/lib/currency";
import prisma from "@/lib/prisma";
import type { Currency } from "@/lib/types";
import { loadSettings } from "@/lib/settingsService";

const normalize = (value: string) => value.trim().toLowerCase();

export const recalculateGoalProgress = async () => {
  await Promise.all([ensureGoalsSchema(), ensureOperationsSchema()]);

  const [settings, goals] = await Promise.all([
    loadSettings(),
    prisma.goal.findMany()
  ]);

  if (goals.length === 0) {
    return;
  }

  const expenses = await prisma.operation.findMany({
    where: { type: "expense" }
  });

  const progress = new Map<string, number>();

  for (const operation of expenses) {
    const amount = Number(operation.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    const category = normalize(operation.category);
    const currency = operation.currency as Currency;
    const amountInBase = convertToBase(amount, currency, settings);

    progress.set(category, (progress.get(category) ?? 0) + amountInBase);
  }

  await Promise.all(
    goals.map((goal) => {
      const key = normalize(goal.title);
      const currentAmount = progress.get(key) ?? 0;
      const status = currentAmount >= Number(goal.target_amount) ? "done" : "active";

      return prisma.goal.update({
        where: { id: goal.id },
        data: {
          current_amount: new Prisma.Decimal(currentAmount),
          status
        }
      });
    })
  );
};
