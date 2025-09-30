"use client";

import type { WalletWithCurrency } from "@/lib/types";
import styles from "./WalletList.module.css";

const ICONS: Record<string, string> = {
  card: "💳",
  bank: "🏦",
  cash: "💵",
  crypto: "🪙"
};

const pickIcon = (name: string) => {
  const normalized = name.toLowerCase();

  if (/(карта|card)/.test(normalized)) {
    return ICONS.card;
  }

  if (/(банк|account|сч[её]т|bank)/.test(normalized)) {
    return ICONS.bank;
  }

  if (/(нал|cash)/.test(normalized)) {
    return ICONS.cash;
  }

  if (/(crypto|крипт)/.test(normalized)) {
    return ICONS.crypto;
  }

  return "👛";
};

export type WalletListProps = {
  wallets: WalletWithCurrency[];
  selectedWalletId: string | null;
  onSelect: (walletId: string) => void;
};

const WalletList = ({ wallets, selectedWalletId, onSelect }: WalletListProps) => (
  <div className={styles.grid}>
    {wallets.map((wallet) => {
      const isSelected = wallet.id === selectedWalletId;

      return (
        <button
          key={wallet.id}
          type="button"
          className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`.trim()}
          onClick={() => onSelect(wallet.id)}
        >
          <span className={styles.icon} aria-hidden>{pickIcon(wallet.name)}</span>
          <span className={styles.name}>{wallet.name}</span>
          <span className={styles.balanceLabel}>Баланс</span>
          <span className={styles.balancePlaceholder}>—</span>
          <span className={styles.currency}>{wallet.currency}</span>
        </button>
      );
    })}
  </div>
);

export default WalletList;
