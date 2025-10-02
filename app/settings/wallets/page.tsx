"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import { useSession } from "@/components/SessionProvider";
import { apiFetch } from "@/lib/apiClient";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Currency, WalletWithCurrency } from "@/lib/types";
import { fetcher, type FetcherError } from "@/lib/fetcher";

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
  const defaultCurrency = useMemo(() => SUPPORTED_CURRENCIES[0], []);
  const [newWallet, setNewWallet] = useState("");
  const [newWalletCurrency, setNewWalletCurrency] = useState<Currency>(defaultCurrency);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editedWalletName, setEditedWalletName] = useState<string>("");
  const [renaming, setRenaming] = useState<string | null>(null);
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

    setWallets(Array.isArray(walletsData.wallets) ? walletsData.wallets : []);
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

    if (wallets.some((item) => item.name.toLowerCase() === value.toLowerCase())) {
      setError("Такой кошелёк уже существует");
      return;
    }

    setSaving(true);

    try {
      const response = await apiFetch("/api/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: value, currency: newWalletCurrency })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; wallet?: WalletWithCurrency }
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

      const created = data?.wallet ?? {
        id: value.toLowerCase(),
        name: value,
        currency: newWalletCurrency
      };

      setWallets((prev) => [...prev, created]);
      setNewWallet("");
      setNewWalletCurrency(defaultCurrency);
      setMessage(`Кошелёк «${created.name}» (${created.currency}) добавлен`);
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
      const response = await apiFetch("/api/wallets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; wallet?: WalletWithCurrency }
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

      const removedName = data?.wallet?.name ?? name;
      setWallets((prev) => prev.filter((item) => item.name.toLowerCase() !== removedName.toLowerCase()));
      setMessage(`Кошелёк «${removedName}» удалён`);
      void mutateWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeleting(null);
    }
  };

  const startEditing = (wallet: WalletWithCurrency) => {
    setEditedWalletName(wallet.name);
    setEditingWalletId(wallet.id);
    setError(null);
    setMessage(null);
  };

  const cancelEditing = () => {
    setEditingWalletId(null);
    setEditedWalletName("");
  };

  const handleRename = async (wallet: WalletWithCurrency) => {
    if (!canManage) {
      setError("Недостаточно прав для изменения списка кошельков");
      return;
    }

    const nextValue = editedWalletName.trim();

    if (!nextValue) {
      setError("Введите новое название");
      return;
    }

    if (nextValue.toLowerCase() === wallet.name.toLowerCase()) {
      setError("Название не изменилось");
      return;
    }

    setError(null);
    setMessage(null);
    setRenaming(wallet.id);

    try {
      const response = await apiFetch("/api/wallets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: wallet.name, newName: nextValue })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; wallet?: WalletWithCurrency }
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
        throw new Error(data?.error ?? "Не удалось переименовать кошелёк");
      }

      const updated = data?.wallet ?? {
        ...wallet,
        name: nextValue
      };

      setWallets((prev) =>
        prev.map((item) =>
          item.id === wallet.id
            ? { ...item, name: updated.name }
            : item
        )
      );
      setMessage(`Кошелёк «${wallet.name}» переименован в «${updated.name}»`);
      setEditingWalletId(null);
      setEditedWalletName("");
      void mutateWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setRenaming(null);
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
              setMessage(null);
            }}
            disabled={!canManage || saving}
            className="w-full rounded-xl border px-4 py-3 sm:w-[160px]"
            aria-label="Валюта кошелька"
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
            {wallets.map((wallet) => {
              const isDeleting = deleting === wallet.name;
              const isEditing = editingWalletId === wallet.id;
              const isRenaming = renaming === wallet.id;

              return (
                <li
                  key={wallet.id}
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "1 1 auto" }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedWalletName}
                        onChange={(event) => {
                          setEditedWalletName(event.target.value);
                          setError(null);
                          setMessage(null);
                        }}
                        disabled={isRenaming}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    ) : (
                      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{wallet.name}</span>
                    )}
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Валюта: {wallet.currency}
                    </span>
                  </div>
                  {canManage ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "flex-end" }}>
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRename(wallet)}
                            disabled={isRenaming}
                            data-variant="primary"
                          >
                            {isRenaming ? "Сохраняем..." : "Сохранить"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={isRenaming}
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(wallet)}
                            disabled={isDeleting}
                          >
                            Переименовать
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(wallet.name)}
                            disabled={isDeleting}
                            data-variant="danger"
                          >
                            {isDeleting ? "Удаляем..." : "Удалить"}
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
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
