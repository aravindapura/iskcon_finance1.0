import type { Prisma, PrismaClient } from "@prisma/client";
import { convertToBase, sanitizeCurrency } from "@/lib/currency";
import type { Currency, Settings } from "@/lib/types";

const NEGATIVE_BALANCE_EPSILON = 1e-6;

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type GoalLike = { title: string | null };

type StoredDebtComment = {
  existing?: unknown;
};

const parseExistingDebtFlag = (comment: string | null): boolean => {
  if (!comment) {
    return false;
  }

  try {
    const parsed = JSON.parse(comment) as StoredDebtComment | null;

    if (parsed && typeof parsed === "object") {
      return parsed.existing === true;
    }
  } catch {
    // Comment is a plain string, ignore parsing errors.
  }

  return false;
};

export const buildGoalCategorySet = (goals: GoalLike[]): Set<string> => {
  const set = new Set<string>();

  for (const goal of goals) {
    const normalized =
      typeof goal.title === "string" ? goal.title.trim().toLowerCase() : "";

    if (normalized) {
      set.add(normalized);
    }
  }

  return set;
};

const normalizeWalletName = (walletName: string): { equals: string; mode: "insensitive" } => ({
  equals: walletName,
  mode: "insensitive"
});

export const calculateWalletBalanceInBase = async (
  client: PrismaExecutor,
  walletName: string,
  settings: Settings,
  _goalCategorySet: Set<string>
): Promise<number> => {
  const [operations, debts] = await Promise.all([
    client.operation.findMany({
      where: {
        wallet: normalizeWalletName(walletName)
      }
    }),
    client.debt.findMany({
      where: {
        wallet: normalizeWalletName(walletName),
        status: "open"
      }
    })
  ]);

  let balanceInBase = 0;

  for (const operation of operations) {
    const currency = sanitizeCurrency(operation.currency, settings.baseCurrency);
    const amount = Number(operation.amount);
    const amountInBase = convertToBase(amount, currency, settings);

    if (operation.type === "income") {
      balanceInBase += amountInBase;
      continue;
    }

    balanceInBase -= amountInBase;
  }

  for (const debt of debts) {
    if (parseExistingDebtFlag(debt.comment)) {
      continue;
    }

    const currency = sanitizeCurrency(debt.currency, settings.baseCurrency);
    const amount = Number(debt.amount);
    const amountInBase = convertToBase(amount, currency, settings);

    if (debt.type === "borrowed") {
      balanceInBase += amountInBase;
    } else {
      balanceInBase -= amountInBase;
    }
  }

  return balanceInBase;
};

export const resolveWalletCurrency = (
  walletCurrency: unknown,
  fallback: Currency
): Currency => sanitizeCurrency(walletCurrency, fallback);

export const isNegativeBalance = (value: number): boolean => value < -NEGATIVE_BALANCE_EPSILON;
