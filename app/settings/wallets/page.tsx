"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AuthGate from "@/components/AuthGate";
import { useSession } from "@/components/SessionProvider";
import type { Wallet } from "@/lib/types";

type WalletsResponse = {
  wallets: Wallet[];
};

const WalletSettings = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "accountant";
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newWallet, setNewWallet] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const loadWallets = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/wallets");

        if (response.status === 401) {
          setError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (!response.ok) {
          throw new Error("Не удалось загрузить кошельки");
        }

        const data = (await response.json().catch(() => null)) as
          | WalletsResponse
          | null;

        if (!data) {
          throw new Error("Не удалось загрузить кошельки");
        }

        setWallets(Array.isArray(data.wallets) ? data.wallets : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setLoading(false);
      }
    };

    void loadWallets();
  }, [refresh]);

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

    if (wallets.some((item) => item.toLowerCase() === value.toLowerCase())) {
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
        body: JSON.stringify({ name: value })
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
        throw new Error(data?.error ?? "Не удалось добавить кошелёк");
      }

      setWallets((prev) => [...prev, value]);
      setNewWallet("");
      setMessage(`Кошелёк «${value}» добавлен`);
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

      setWallets((prev) => prev.filter((item) => item !== name));
      setMessage(`Кошелёк «${name}» удалён`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeleting(null);
    }
  };

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
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Управление кошельками
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Добавляйте и удаляйте кошельки. История операций сохраняется, даже если
            кошелёк удалён из списка.
          </p>
        </header>

        {loading ? <p style={{ color: "var(--text-muted)" }}>Загружаем список...</p> : null}

        <form onSubmit={handleAdd} className="flex items-center gap-3">
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
            className="flex-1 min-w-0 rounded-xl border px-4 py-3"
            style={{ minWidth: "220px" }}
          />
          <button
            type="submit"
            disabled={!canManage || saving}
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold whitespace-nowrap transition-colors"
            style={{
              backgroundColor: !canManage || saving ? "var(--accent-disabled-strong)" : "var(--accent-teal)",
              color: "var(--surface-primary)",
              boxShadow: "0 10px 18px rgba(13, 148, 136, 0.25)",
              cursor: !canManage || saving ? "not-allowed" : "pointer"
            }}
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
              const isDeleting = deleting === wallet;

              return (
                <li
                  key={wallet}
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
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{wallet}</span>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(wallet)}
                      disabled={isDeleting}
                      style={{
                        border: "none",
                        backgroundColor: "var(--accent-danger-bright)",
                        color: "var(--surface-primary)",
                        borderRadius: "999px",
                        padding: "0.35rem 0.85rem",
                        fontSize: "0.85rem",
                        cursor: isDeleting ? "not-allowed" : "pointer"
                      }}
                    >
                      {isDeleting ? "Удаляем..." : "Удалить"}
                    </button>
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
