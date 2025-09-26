import { convertToBase } from "@/lib/currency";
import { extractDebtPaymentAmount } from "@/lib/debtPayments";
import type {
  Currency,
  Debt,
  Goal,
  Operation,
  Settings,
  Wallet
} from "@/lib/types";

export type WalletBalanceEntry = {
  wallet: Wallet;
  baseAmount: number;
  byCurrency: Partial<Record<Currency, number>>;
};

type WalletBalanceMap = Map<string, WalletBalanceEntry>;

type WalletBalanceInput = {
  walletNames?: Wallet[];
  operations: Operation[];
  debts: Debt[];
  goals: Goal[];
  settings: Settings;
};

const normalizeWalletName = (wallet: Wallet) => wallet.trim().toLowerCase();

export const buildWalletBalanceMap = ({
  walletNames = [],
  operations,
  debts,
  goals,
  settings
}: WalletBalanceInput): WalletBalanceMap => {
  const goalCategorySet = new Set(goals.map((goal) => goal.title.toLowerCase()));
  const canonicalNames = new Map<string, Wallet>();
  const balances: WalletBalanceMap = new Map();

  const ensureCanonicalName = (wallet: Wallet) => {
    const normalized = normalizeWalletName(wallet);

    if (!canonicalNames.has(normalized)) {
      canonicalNames.set(normalized, wallet);
    }

    return canonicalNames.get(normalized) ?? wallet;
  };

  const ensureEntry = (wallet: Wallet) => {
    const canonical = ensureCanonicalName(wallet);
    const normalized = normalizeWalletName(canonical);
    const existing = balances.get(normalized);

    if (existing) {
      return existing;
    }

    const entry: WalletBalanceEntry = {
      wallet: canonical,
      baseAmount: 0,
      byCurrency: {}
    };

    balances.set(normalized, entry);

    return entry;
  };

  const updateCurrencyAmount = (
    map: Partial<Record<Currency, number>>,
    currency: Currency,
    updater: (previous: number) => number
  ) => {
    map[currency] = updater(map[currency] ?? 0);
  };

  for (const wallet of walletNames) {
    ensureEntry(wallet);
  }

  for (const operation of operations) {
    if (operation.type === "expense" && goalCategorySet.has(operation.category.toLowerCase())) {
      continue;
    }

    const entry = ensureEntry(operation.wallet);
    const amountInBase = convertToBase(operation.amount, operation.currency, settings);

    if (operation.type === "income") {
      entry.baseAmount += amountInBase;
      updateCurrencyAmount(entry.byCurrency, operation.currency, (previous) => previous + operation.amount);
      continue;
    }

    entry.baseAmount -= amountInBase;
    updateCurrencyAmount(entry.byCurrency, operation.currency, (previous) => previous - operation.amount);

    const debtPaymentAmount = extractDebtPaymentAmount(operation.source);

    if (debtPaymentAmount > 0) {
      const paymentInBase = convertToBase(debtPaymentAmount, operation.currency, settings);
      entry.baseAmount += paymentInBase;
      updateCurrencyAmount(entry.byCurrency, operation.currency, (previous) => previous + debtPaymentAmount);
    }
  }

  for (const debt of debts) {
    if (debt.status === "closed") {
      continue;
    }

    if (debt.existing === true) {
      continue;
    }

    const entry = ensureEntry(debt.wallet);
    const amountInBase = convertToBase(debt.amount, debt.currency, settings);

    if (debt.type === "borrowed") {
      entry.baseAmount += amountInBase;
      updateCurrencyAmount(entry.byCurrency, debt.currency, (previous) => previous + debt.amount);
      continue;
    }

    entry.baseAmount -= amountInBase;
    updateCurrencyAmount(entry.byCurrency, debt.currency, (previous) => previous - debt.amount);
  }

  return balances;
};

export const getWalletBalance = (
  balances: WalletBalanceMap,
  wallet: Wallet
): WalletBalanceEntry | null => {
  const normalized = normalizeWalletName(wallet);

  return balances.get(normalized) ?? null;
};
