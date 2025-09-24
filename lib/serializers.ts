import type {
  Operation as PrismaOperation,
  Debt as PrismaDebt,
  Goal as PrismaGoal
} from "@prisma/client";
import type { Currency, Debt, Goal, Operation } from "@/lib/types";

type StoredDebtComment = {
  note?: unknown;
  existing?: unknown;
};

const parseStoredDebtComment = (value: string | null) => {
  if (!value) {
    return { comment: undefined, existing: false } as const;
  }

  try {
    const parsed = JSON.parse(value) as StoredDebtComment;

    if (parsed && typeof parsed === "object" && "existing" in parsed) {
      const rawNote = parsed.note;
      const normalizedNote =
        typeof rawNote === "string" && rawNote.trim().length > 0
          ? rawNote.trim()
          : undefined;

      return {
        comment: normalizedNote,
        existing: parsed.existing === true
      } as const;
    }
  } catch {
    // Fallback to plain text comment
  }

  return { comment: value ?? undefined, existing: false } as const;
};

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

export const serializeDebt = (debt: PrismaDebt): Debt => {
  const { comment, existing } = parseStoredDebtComment(debt.comment);

  return {
    id: debt.id,
    type: debt.type === "lent" ? "lent" : "borrowed",
    amount: Number(debt.amount),
    currency: debt.currency as Currency,
    status: debt.status === "closed" ? "closed" : "open",
    date: debt.registered_at.toISOString(),
    wallet: debt.wallet,
    from: debt.from_contact ?? undefined,
    to: debt.to_contact ?? undefined,
    comment,
    existing
  };
};

export const serializeGoal = (goal: PrismaGoal): Goal => ({
  id: goal.id,
  title: goal.title,
  targetAmount: Number(goal.target_amount),
  currentAmount: Number(goal.current_amount),
  status: goal.status === "done" ? "done" : "active",
  currency: goal.currency as Currency
});
