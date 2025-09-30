"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type WalletRow = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  category: string;
};

type WalletTableProps = {
  wallets: WalletRow[];
  loading?: boolean;
  onAddTransaction: (walletId: string, type: "INCOME" | "EXPENSE") => void;
};

const WalletTable = ({ wallets, loading = false, onAddTransaction }: WalletTableProps) => {
  const [openWalletId, setOpenWalletId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openWalletId) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      if (event.target instanceof Node && containerRef.current.contains(event.target)) {
        return;
      }

      setOpenWalletId(null);
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openWalletId]);

  const rows = useMemo(() => {
    if (loading) {
      return Array.from({ length: 4 }, (_, index) => (
        <div
          key={`skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-subtle)] p-4"
        >
          <div className="mb-3 h-4 w-1/3 rounded-full bg-[var(--border-strong)]/60" />
          <div className="flex items-center justify-between gap-3">
            <div className="h-6 w-1/4 rounded-full bg-[var(--border-strong)]/60" />
            <div className="h-8 w-8 rounded-full bg-[var(--border-strong)]/40" />
          </div>
        </div>
      ));
    }

    return wallets.map((wallet) => {
      const formatter = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: wallet.currency
      });

      const formattedBalance = formatter.format(wallet.balance);
      const isMenuOpen = openWalletId === wallet.id;

      return (
        <div
          key={wallet.id}
          className="relative flex flex-col gap-1 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-strong)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {wallet.category}
              </span>
              <span className="text-lg font-semibold text-[var(--text-strong)]">
                {wallet.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Добавить транзакцию для ${wallet.name}`}
                onClick={() => {
                  setOpenWalletId((current) => (current === wallet.id ? null : wallet.id));
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xl font-bold text-white shadow-[var(--shadow-button)] transition hover:bg-[var(--accent-primary-hover)]"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-2xl font-semibold text-[var(--text-strong)]">{formattedBalance}</span>
            <span className="text-sm font-medium text-[var(--text-muted)]">{wallet.currency}</span>
          </div>

          {isMenuOpen ? (
            <div className="absolute right-4 top-16 z-20 w-44 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-primary)] py-2 shadow-[var(--shadow-card)]">
              <button
                type="button"
                onClick={() => {
                  onAddTransaction(wallet.id, "INCOME");
                  setOpenWalletId(null);
                }}
                className="block w-full px-4 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--text-strong)]"
              >
                Добавить доход
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddTransaction(wallet.id, "EXPENSE");
                  setOpenWalletId(null);
                }}
                className="block w-full px-4 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--accent-danger)]"
              >
                Добавить расход
              </button>
            </div>
          ) : null}
        </div>
      );
    });
  }, [loading, onAddTransaction, openWalletId, wallets]);

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      <div className="hidden flex-col gap-3 md:flex">
        <div className="grid grid-cols-4 gap-3 text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
          <span>Кошелёк</span>
          <span>Баланс</span>
          <span>Валюта</span>
          <span className="text-right">Действия</span>
        </div>
        <div className="flex flex-col gap-3">
          {wallets.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-6 text-center text-sm text-[var(--text-muted)]">
              Кошельки не найдены. Добавьте первый кошелёк, чтобы начать работу.
            </div>
          ) : (
            wallets.map((wallet) => {
              const formatter = new Intl.NumberFormat("ru-RU", {
                style: "currency",
                currency: wallet.currency
              });
              const formattedBalance = formatter.format(wallet.balance);
              const isMenuOpen = openWalletId === wallet.id;

              return (
                <div
                  key={`table-${wallet.id}`}
                  className="relative grid grid-cols-4 items-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-primary)] px-6 py-4 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-strong)]"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      {wallet.category}
                    </span>
                    <span className="text-base font-semibold text-[var(--text-strong)]">{wallet.name}</span>
                  </div>
                  <span className="text-lg font-semibold text-[var(--text-strong)]">{formattedBalance}</span>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{wallet.currency}</span>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      aria-label={`Добавить транзакцию для ${wallet.name}`}
                      onClick={() => {
                        setOpenWalletId((current) => (current === wallet.id ? null : wallet.id));
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xl font-bold text-white shadow-[var(--shadow-button)] transition hover:bg-[var(--accent-primary-hover)]"
                    >
                      +
                    </button>
                  </div>
                  {isMenuOpen ? (
                    <div className="absolute right-6 top-16 z-20 w-48 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-primary)] py-2 shadow-[var(--shadow-card)]">
                      <button
                        type="button"
                        onClick={() => {
                          onAddTransaction(wallet.id, "INCOME");
                          setOpenWalletId(null);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--text-strong)]"
                      >
                        Добавить доход
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAddTransaction(wallet.id, "EXPENSE");
                          setOpenWalletId(null);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--accent-danger)]"
                      >
                        Добавить расход
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {rows}
        {wallets.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-6 text-center text-sm text-[var(--text-muted)]">
            Кошельки не найдены. Добавьте первый кошелёк, чтобы начать работу.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export type { WalletRow };
export default WalletTable;
