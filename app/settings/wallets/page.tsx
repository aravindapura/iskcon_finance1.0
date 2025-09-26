"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import { useSession } from "@/components/SessionProvider";
import { type Currency, type WalletWithCurrency } from "@/lib/types";
import {
  DEFAULT_SETTINGS,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES
} from "@/lib/currency";
import { fetcher, type FetcherError } from "@/lib/fetcher";
import {
  expandWalletOptions,
  isWalletAlias,
  resolveWalletAlias
} from "@/lib/walletAliases";

type WalletsResponse = {
  wallets: WalletWithCurrency[];
};

const WalletSettings = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "admin";
  const [wallets, setWallets] = useState<WalletWithCurrency[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newWallet, setNewWallet] = useState("");
  const [newWalletCurrency, setNewWalletCurrency] = useState<Currency>(
    DEFAULT_SETTINGS.baseCurrency
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const {
    data: walletsData,
    error: walletsError,
    isLoading: walletsLoading,
    mutate: mutateWallets
  } = useSWR<WalletsResponse>(user ? "/api/wallets" : null, fetcher, {
    revalidateOnFocus: true
  });

  const loading = walletsLoading;

  useEffect(() => {
    if (!walletsData) {
      return;
    }

    const walletList = Array.isArray(walletsData.wallets) ? walletsData.wallets : [];
    const sanitized = walletList
      .map((item) => {
        if (!item || typeof item.name !== "string") {
          return null;
        }

        const trimmedName = item.name.trim();

        if (!trimmedName) {
          return null;
        }

        const currency = isSupportedCurrency(item.currency) ? item.currency : null;

        return { name: trimmedName, currency } as WalletWithCurrency;
      })
      .filter(Boolean) as WalletWithCurrency[];

    setWallets(sanitized);
  }, [walletsData]);

  useEffect(() => {
    if (!walletsError) {
      setError(null);
      return;
    }

    if ((walletsError as FetcherError).status === 401) {
      setError("Сессия истекла, войдите заново.");
      void refresh();
      return;
    }

    setError("Не удалось загрузить кошельки");
  }, [walletsError, refresh]);

  const displayWallets = useMemo(
    () => {
      const baseEntries = wallets.map((wallet) => ({
        name: wallet.name,
        currency: wallet.currency,
        removable: true,
        isAlias: false,
        canonical: wallet.name
      }));

      const baseLookup = new Set(baseEntries.map((entry) => entry.name.toLowerCase()));
      const aliasEntries = expandWalletOptions(wallets)
        .filter((option) => !baseLookup.has(option.name.toLowerCase()))
        .map((option) => ({
          name: option.name,
          currency: option.currency,
          removable: false,
          isAlias: true,
          canonical: resolveWalletAlias(option.name)
        }));

      return [...baseEntries, ...aliasEntries];
    },
    [wallets]
  );

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManage) {
      setError("Недостаточно прав для изменения списка кошельков");
      return;
    }

    setError(null);
    setMessage(null);

    const value = newWallet.trim();

    if (!value) {
      setError("Введите название кошелька");
      return;
    }

    if (isWalletAlias(value)) {
      const canonical = resolveWalletAlias(value);
      setError(`Кошелёк «${value}» уже доступен в составе «${canonical}».`);
      return;
    }

    if (wallets.some((item) => item.name.toLowerCase() === value.toLowerCase())) {
      setError("Такой кошелёк уже существует");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: value, currency: newWalletCurrency })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; name?: string; currency?: Currency | null }
        | null;

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для изменения списка кошельков");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error ?? "Не удалось добавить кошелёк");
      }

      const createdCurrency = isSupportedCurrency(data?.currency)
        ? data?.currency
        : newWalletCurrency;

      setWallets((prev) => [...prev, { name: value, currency: createdCurrency }]);
      setNewWallet("");
      setMessage(`Кошелёк «${value}» добавлен`);
      void mutateWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!canManage) {
      setError("Недостаточно прав для изменения списка кошельков");
      return;
    }

    setError(null);
    setMessage(null);
    setDeleting(name);

    try {
      const response = await fetch("/api/wallets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; name?: string }
        | null;

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для изменения списка кошельков");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error ?? "Не удалось удалить кошелёк");
      }

      setWallets((prev) =>
        prev.filter((item) => item.name.toLowerCase() !== name.toLowerCase())
      );
    setMessage(`Кошелёк «${name}» удалён`);
      void mutateWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeleting(null);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <main
      className="page-shell bg-white text-black dark:bg-midnight dark:text-slate-100"
      style={{
        maxWidth: "760px",
        width: "100%",
        padding: "2.5rem 2.75rem",
        gap: "2rem"
      }}
    >
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "1rem",
            flexWrap: "wrap"
          }}
        >
          <Link
            href="/settings"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: "var(--surface-teal)",
              color: "var(--accent-teal)",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(45, 212, 191, 0.25)"
            }}
          >
            Настройки
          </Link>
          <Link
            href="/"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: "var(--surface-blue)",
              color: "var(--accent-blue)",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)"
            }}
          >
            Главная
          </Link>
        </nav>

        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
            Управление кошельками
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Добавляйте и удаляйте кошельки. История операций сохраняется, даже если
            кошелёк удалён из списка.
          </p>
        </header>

        {loading ? <p style={{ color: "var(--text-muted)" }}>Загружаем список...</p> : null}

        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            value={newWallet}
            onChange={(event) => {
              setNewWallet(event.target.value);
              setError(null);
              setMessage(null);
            }}
            disabled={!canManage || saving}
            placeholder="Название кошелька"
            className="w-full flex-1 min-w-0 rounded-xl border px-4 py-3"
            style={{ minWidth: "min(220px, 100%)" }}
          />
          <select
            value={newWalletCurrency}
            onChange={(event) => {
              setNewWalletCurrency(event.target.value as Currency);
              setError(null);
            }}
            disabled={!canManage || saving}
            className="rounded-xl border px-4 py-3 sm:w-40"
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!canManage || saving}
            className="inline-flex w-full items-center justify-center rounded-xl px-5 py-3 font-semibold whitespace-nowrap transition-colors sm:w-auto"
            data-variant="primary"
          >
            {saving ? "Сохраняем..." : "Добавить"}
          </button>
        </form>

        {wallets.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>
            Список пуст. Добавьте первый кошелёк, чтобы использовать его в операциях.
          </p>
        ) : (
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem"
            }}
          >
            {displayWallets.map((wallet) => {
              const isDeleting =
                deleting !== null && deleting.toLowerCase() === wallet.name.toLowerCase();

              return (
                <li
                  key={wallet.name}
                  data-card="split"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.85rem",
                    backgroundColor: "var(--surface-teal-bright)",
                    border: "1px solid var(--surface-teal-strong)"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {wallet.name}
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      Валюта: {wallet.currency ?? "—"}
                    </span>
                    {wallet.isAlias ? (
                      <span style={{ color: "var(--accent-blue)", fontSize: "0.75rem" }}>
                        Связан с «{wallet.canonical}»
                      </span>
                    ) : null}
                  </div>
                  {wallet.removable && canManage ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(wallet.name)}
                      disabled={isDeleting}
                      data-variant="danger"
                    >
                      {isDeleting ? "Удаляем..." : "Удалить"}
                    </button>
                  ) : (
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      Системный кошелёк
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!canManage ? (
          <p style={{ color: "var(--text-muted)" }}>
            Вы вошли как наблюдатель — изменение списка кошельков недоступно.
          </p>
        ) : null}

        {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
        {message ? <p style={{ color: "var(--accent-teal-strong)" }}>{message}</p> : null}
    </main>
  );
};

const WalletSettingsPage = () => (
  <AuthGate>
    <WalletSettings />
  </AuthGate>
);

export default WalletSettingsPage;
