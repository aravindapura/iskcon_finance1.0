import type { Wallet } from "@/lib/types";

const normalizeWalletValue = (value: string) => value.trim().toLowerCase();

const CASH_CANONICAL: Wallet = "наличные";

const WALLET_ALIAS_DEFINITIONS: Record<string, Wallet[]> = {
  [normalizeWalletValue(CASH_CANONICAL)]: ["наличные доллар", "наличные лари"],
};

const CANONICAL_DISPLAY: Record<string, Wallet> = {
  [normalizeWalletValue(CASH_CANONICAL)]: CASH_CANONICAL,
};

const ALIAS_TO_CANONICAL = new Map<string, Wallet>();

for (const [canonicalKey, aliases] of Object.entries(WALLET_ALIAS_DEFINITIONS)) {
  const canonicalDisplay = CANONICAL_DISPLAY[canonicalKey] ?? canonicalKey;

  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(normalizeWalletValue(alias), canonicalDisplay);
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
        const aliasNormalized = normalizeWalletValue(alias);

        if (!seen.has(aliasNormalized)) {
          seen.add(aliasNormalized);
          expanded.push(alias);
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
