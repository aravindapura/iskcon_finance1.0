import type { Currency, Wallet, WalletWithCurrency } from "@/lib/types";

const normalizeWalletValue = (value: string) => value.trim().toLowerCase();

const CASH_CANONICAL: Wallet = "наличные";

type WalletAliasDefinition = {
  name: Wallet;
  currency?: Currency | null;
};

const WALLET_ALIAS_DEFINITIONS: Record<string, WalletAliasDefinition[]> = {
  [normalizeWalletValue(CASH_CANONICAL)]: [
    { name: "наличные доллар", currency: "USD" },
    { name: "наличные лари", currency: "GEL" }
  ]
};

const CANONICAL_DISPLAY: Record<string, Wallet> = {
  [normalizeWalletValue(CASH_CANONICAL)]: CASH_CANONICAL
};

const ALIAS_TO_CANONICAL = new Map<string, Wallet>();
const ALIAS_TO_CURRENCY = new Map<string, Currency>();

for (const [canonicalKey, aliases] of Object.entries(WALLET_ALIAS_DEFINITIONS)) {
  const canonicalDisplay = CANONICAL_DISPLAY[canonicalKey] ?? canonicalKey;

  for (const alias of aliases) {
    const aliasNormalized = normalizeWalletValue(alias.name);

    ALIAS_TO_CANONICAL.set(aliasNormalized, canonicalDisplay);

    if (alias.currency) {
      ALIAS_TO_CURRENCY.set(aliasNormalized, alias.currency);
    }
  }
}

export const expandWalletDisplayNames = (wallets: Wallet[]): Wallet[] => {
  const seen = new Set<string>();
  const expanded: Wallet[] = [];

  for (const wallet of wallets) {
    const normalized = normalizeWalletValue(wallet);
    const aliasList = WALLET_ALIAS_DEFINITIONS[normalized];

    if (aliasList && aliasList.length > 0) {
      for (const alias of aliasList) {
        const aliasNormalized = normalizeWalletValue(alias.name);

        if (!seen.has(aliasNormalized)) {
          seen.add(aliasNormalized);
          expanded.push(alias.name);
        }
      }

      continue;
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      expanded.push(wallet.trim());
    }
  }

  return expanded;
};

export const expandWalletOptions = (wallets: WalletWithCurrency[]): WalletWithCurrency[] => {
  const seen = new Set<string>();
  const expanded: WalletWithCurrency[] = [];

  for (const wallet of wallets) {
    const normalized = normalizeWalletValue(wallet.name);
    const aliasList = WALLET_ALIAS_DEFINITIONS[normalized];

    if (aliasList && aliasList.length > 0) {
      for (const alias of aliasList) {
        const aliasNormalized = normalizeWalletValue(alias.name);

        if (seen.has(aliasNormalized)) {
          continue;
        }

        const aliasCurrency =
          alias.currency ?? ALIAS_TO_CURRENCY.get(aliasNormalized) ?? wallet.currency ?? null;

        expanded.push({
          name: alias.name.trim(),
          currency: aliasCurrency
        });
        seen.add(aliasNormalized);
      }

      continue;
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      expanded.push({ name: wallet.name.trim(), currency: wallet.currency ?? null });
    }
  }

  return expanded;
};

export const resolveWalletAlias = (wallet: Wallet): Wallet => {
  const normalized = normalizeWalletValue(wallet);

  if (CANONICAL_DISPLAY[normalized]) {
    return CANONICAL_DISPLAY[normalized];
  }

  return ALIAS_TO_CANONICAL.get(normalized) ?? wallet.trim();
};

export const isWalletAlias = (wallet: Wallet): boolean => {
  const normalized = normalizeWalletValue(wallet);

  return ALIAS_TO_CANONICAL.has(normalized);
};

export const getAliasCurrency = (wallet: Wallet): Currency | null => {
  const normalized = normalizeWalletValue(wallet);

  return ALIAS_TO_CURRENCY.get(normalized) ?? null;
};
