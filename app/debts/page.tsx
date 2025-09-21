"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AuthGate from "@/components/AuthGate";
import { useSession } from "@/components/SessionProvider";
import {
  convertToBase,
  DEFAULT_SETTINGS,
  SUPPORTED_CURRENCIES
} from "@/lib/currency";
import {
  WALLETS,
  type Currency,
  type Debt,
  type Settings,
  type Wallet
} from "@/lib/types";

const DebtsContent = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "accountant";

  const [debts, setDebts] = useState<Debt[]>([]);
  const [type, setType] = useState<Debt["type"]>("borrowed");
  const [amount, setAmount] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>(DEFAULT_SETTINGS.baseCurrency);
  const [wallet, setWallet] = useState<Wallet>(WALLETS[0]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadDebts = async () => {
      setError(null);
      setInitialLoading(true);

      try {
        const [debtsResponse, settingsResponse] = await Promise.all([
          fetch("/api/debts"),
          fetch("/api/settings")
        ]);

        if (debtsResponse.status === 401 || settingsResponse.status === 401) {
          setError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (!debtsResponse.ok) {
          throw new Error("Не удалось загрузить долги");
        }

        if (!settingsResponse.ok) {
          throw new Error("Не удалось загрузить настройки");
        }

        const [debtsData, settingsData] = await Promise.all([
          debtsResponse.json() as Promise<Debt[]>,
          settingsResponse.json() as Promise<Settings>
        ]);

        setDebts(debtsData);
        setSettings(settingsData);
        setCurrency(settingsData.baseCurrency);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setInitialLoading(false);
      }
    };

    void loadDebts();
  }, [user, refresh]);

  const totals = useMemo(() => {
    const activeSettings = settings ?? DEFAULT_SETTINGS;

    return debts.reduce(
      (acc, debt) => {
        if (debt.status === "closed") {
          return acc;
        }

        const amountInBase = convertToBase(debt.amount, debt.currency, activeSettings);

        if (debt.type === "borrowed") {
          return {
            ...acc,
            borrowed: acc.borrowed + amountInBase,
            balanceEffect: acc.balanceEffect - amountInBase
          };
        }

        return {
          ...acc,
          lent: acc.lent + amountInBase,
          balanceEffect: acc.balanceEffect + amountInBase
        };
      },
      { borrowed: 0, lent: 0, balanceEffect: 0 }
    );
  }, [debts, settings]);

  const { borrowed, lent } = totals;
  const activeSettings = settings ?? DEFAULT_SETTINGS;
  const baseFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: activeSettings.baseCurrency
      }),
    [activeSettings.baseCurrency]
  );

  const handleDelete = async (id: string) => {
    if (!canManage) {
      setError("Недостаточно прав для удаления записи о долге");
      return;
    }

    setError(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/debts?id=${id}`, { method: "DELETE" });

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для удаления записи о долге");
        return;
      }

      if (!response.ok) {
        throw new Error("Не удалось удалить долг");
      }

      setDebts((prev) => prev.filter((debt) => debt.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!canManage) {
      setError("Недостаточно прав для добавления долга");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Введите корректную сумму больше нуля");
      return;
    }

    const payload: Record<string, string | number> = {
      type,
      amount: numericAmount,
      currency,
      wallet
    };

    if (type === "borrowed") {
      if (!from.trim()) {
        setError("Укажите, от кого получен долг");
        return;
      }

      payload.from = from.trim();
    } else {
      if (!to.trim()) {
        setError("Укажите, кому выдали долг");
        return;
      }

      payload.to = to.trim();
    }

    if (comment.trim()) {
      payload.comment = comment.trim();
    }

    setLoading(true);

    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для добавления долга");
        return;
      }

      if (!response.ok) {
        throw new Error("Не удалось сохранить долг");
      }

      const created = (await response.json()) as Debt;
      setDebts((prev) => [created, ...prev]);
      setAmount("");
      setFrom("");
      setTo("");
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        width: "min(720px, 100%)",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        padding: "2rem",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
        display: "flex",
        flexDirection: "column",
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
          href="/"
          style={{
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            backgroundColor: "#e0e7ff",
            color: "#1d4ed8",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)"
          }}
        >
          Главная
        </Link>
        <Link
          href="/wallets"
          style={{
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            backgroundColor: "#ccfbf1",
            color: "#0f766e",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(45, 212, 191, 0.25)"
          }}
        >
          Кошельки
        </Link>
        <Link
          href="/debts"
          style={{
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            backgroundColor: "#eef2ff",
            color: "#4338ca",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
          }}
        >
          Долги
        </Link>
        <Link
          href="/planning"
          style={{
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            backgroundColor: "#dcfce7",
            color: "#15803d",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.2)"
          }}
        >
          Планирование
        </Link>
        <Link
          href="/reports"
          style={{
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            backgroundColor: "#fef3c7",
            color: "#b45309",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(217, 119, 6, 0.2)"
          }}
        >
          Отчёты
        </Link>
        <Link
          href="/settings"
          style={{
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            backgroundColor: "#f5f3ff",
            color: "#6d28d9",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(109, 40, 217, 0.2)"
          }}
        >
          Настройки
        </Link>
      </nav>

      <header style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 700, color: "#0f172a" }}>
          Управление долгами
        </h1>
        <p style={{ color: "#475569", lineHeight: 1.5 }}>
          Отслеживайте займы и возвраты, чтобы понимать обязательства общины.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem"
        }}
      >
        <article
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)"
          }}
        >
          <h2 style={{ color: "#0f172a", fontWeight: 600, marginBottom: "0.5rem" }}>
            Мы должны
          </h2>
          <strong style={{ fontSize: "1.5rem", color: "#b91c1c" }}>
            {baseFormatter.format(borrowed)}
          </strong>
        </article>
        <article
          style={{
            backgroundColor: "#f0fdf4",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 12px 24px rgba(34, 197, 94, 0.15)"
          }}
        >
          <h2 style={{ color: "#0f172a", fontWeight: 600, marginBottom: "0.5rem" }}>
            Нам должны
          </h2>
          <strong style={{ fontSize: "1.5rem", color: "#15803d" }}>
            {baseFormatter.format(lent)}
          </strong>
        </article>
      </section>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem"
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span>Тип</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as Debt["type"])}
            disabled={!canManage || loading}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db"
            }}
          >
            <option value="borrowed">Взяли</option>
            <option value="lent">Выдали</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span>Сумма</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={!canManage || loading}
            placeholder="0.00"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db"
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span>Валюта</span>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
            disabled={!canManage || loading}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db"
            }}
          >
            {SUPPORTED_CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span>Кошелёк</span>
          <select
            value={wallet}
            onChange={(event) => setWallet(event.target.value as Wallet)}
            disabled={!canManage || loading}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db"
            }}
          >
            {WALLETS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span>{type === "borrowed" ? "От кого" : "Кому"}</span>
          <input
            type="text"
            value={type === "borrowed" ? from : to}
            onChange={(event) => (type === "borrowed" ? setFrom(event.target.value) : setTo(event.target.value))}
            disabled={!canManage || loading}
            placeholder={type === "borrowed" ? "Имя кредитора" : "Имя получателя"}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db"
            }}
          />
        </label>

        <label style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span>Комментарий</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={!canManage || loading}
            rows={3}
            placeholder="Дополнительная информация"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db",
              resize: "vertical"
            }}
          />
        </label>

        <button
          type="submit"
          disabled={!canManage || loading}
          style={{
            padding: "0.95rem 1.5rem",
            borderRadius: "0.75rem",
            border: "none",
            backgroundColor: loading || !canManage ? "#94a3b8" : "#2563eb",
            color: "#ffffff",
            fontWeight: 600,
            boxShadow: "0 10px 20px rgba(37, 99, 235, 0.25)",
            cursor: !canManage || loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Добавляем..." : "Добавить"}
        </button>
      </form>

      {!canManage ? (
        <p style={{ color: "#64748b" }}>
          Вы вошли как наблюдатель — формы доступны только для просмотра.
        </p>
      ) : null}

      {initialLoading ? <p style={{ color: "#64748b" }}>Загружаем данные...</p> : null}

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 600, color: "#0f172a" }}>
          Текущие долги
        </h2>
        {debts.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            Пока нет записей о долгах.
          </p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {debts.map((debt) => (
              <li
                key={debt.id}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <strong style={{ color: "#0f172a" }}>
                      {debt.type === "borrowed" ? "Взяли" : "Выдали"} — {debt.amount.toLocaleString("ru-RU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}{" "}
                      {debt.currency}
                    </strong>
                    <span style={{ color: "#475569", fontSize: "0.9rem" }}>
                      {new Date(debt.date).toLocaleString("ru-RU")}
                    </span>
                    <span style={{ color: "#475569", fontSize: "0.9rem" }}>
                      Кошелёк: {debt.wallet}
                    </span>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(debt.id)}
                      disabled={deletingId === debt.id}
                      style={{
                        padding: "0.55rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid #ef4444",
                        backgroundColor: deletingId === debt.id ? "#fecaca" : "#fee2e2",
                        color: "#b91c1c",
                        fontWeight: 600,
                        cursor: deletingId === debt.id ? "not-allowed" : "pointer",
                        boxShadow: "0 10px 18px rgba(239, 68, 68, 0.15)"
                      }}
                    >
                      {deletingId === debt.id ? "Удаляем..." : "Удалить"}
                    </button>
                  ) : null}
                </div>
                {debt.comment ? (
                  <p style={{ color: "#475569", lineHeight: 1.5 }}>{debt.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

const DebtsPage = () => (
  <AuthGate>
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        padding: "3rem 1.5rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start"
      }}
    >
      <DebtsContent />
    </div>
  </AuthGate>
);

export default DebtsPage;
