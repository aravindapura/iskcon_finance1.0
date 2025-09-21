import type {
  Operation as PrismaOperation,
  Debt as PrismaDebt,
  Goal as PrismaGoal
} from "@prisma/client";
import type { Currency, Debt, Goal, Operation } from "@/lib/types";

export const serializeOperation = (operation: PrismaOperation): Operation => ({
  id: operation.id,
  type: operation.type === "income" ? "income" : "expense",
  amount: Number(operation.amount),
  currency: operation.currency as Currency,
  category: operation.category,
  wallet: operation.wallet,
  comment: operation.comment ?? undefined,
  source: operation.source ?? undefined,
  date: operation.occurred_at.toISOString()
});

export const serializeDebt = (debt: PrismaDebt): Debt => ({
  id: debt.id,
  type: debt.type === "lent" ? "lent" : "borrowed",
  amount: Number(debt.amount),
  currency: debt.currency as Currency,
  status: debt.status === "closed" ? "closed" : "open",
  date: debt.registered_at.toISOString(),
  wallet: debt.wallet,
  from: debt.from_contact ?? undefined,
  to: debt.to_contact ?? undefined,
  comment: debt.comment ?? undefined
});

export const serializeGoal = (goal: PrismaGoal): Goal => ({
  id: goal.id,
  title: goal.title,
  targetAmount: Number(goal.target_amount),
  currentAmount: Number(goal.current_amount),
  status: goal.status === "done" ? "done" : "active",
  currency: goal.currency as Currency
});
