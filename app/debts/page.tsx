"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Debt } from "@/lib/types";

const CURRENCIES: Debt["currency"][] = ["USD", "RUB", "EUR", "GEL"];

const formatMoney = (amount: number, currency: Debt["currency"]) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

const DebtPage = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [type, setType] = useState<Debt["type"]>("borrowed");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<Debt["currency"]>("USD");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDebts = async () => {
      try {
        const response = await fetch("/api/debts");
        if (!response.ok) {
          throw new Error("Не удалось загрузить долги");
        }

        const data = (await response.json()) as Debt[];
        setDebts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      }
    };

    void loadDebts();
  }, []);

  const totals = useMemo(() => {
    const summary = debts.reduce(
      (acc, debt) => {
        if (debt.status === "closed") {
          return acc;
        }

        if (debt.type === "borrowed") {
          acc.borrowedUsd += debt.amountUsd;
          acc.byCurrency.set(
            debt.currency,
            (acc.byCurrency.get(debt.currency) ?? 0) - debt.amount
          );
        } else {
          acc.lentUsd += debt.amountUsd;
          acc.byCurrency.set(
            debt.currency,
            (acc.byCurrency.get(debt.currency) ?? 0) + debt.amount
          );
        }

        return acc;
      },
      {
        borrowedUsd: 0,
        lentUsd: 0,
        byCurrency: new Map<Debt["currency"], number>()
      }
    );

    return {
      borrowedUsd: summary.borrowedUsd,
      lentUsd: summary.lentUsd,
      balanceUsd: summary.lentUsd - summary.borrowedUsd,
      currencyEntries: Array.from(summary.byCurrency.entries()).filter(([, value]) => value !== 0)
    };
  }, [debts]);

  const handleDelete = async (id: string) => {
    setError(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/debts?id=${id}`, { method: "DELETE" });

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

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Введите корректную сумму больше нуля");
      return;
    }

    const payload: Record<string, string | number> = {
      type,
      amount: numericAmount,
      currency
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
          gap: "1rem",
          flexWrap: "wrap"
        }}
      >
        <Link
          href="/"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            backgroundColor: "#e0f2fe",
            color: "#075985",
            fontWeight: 600
          }}
        >
          Главная
        </Link>
        <Link
          href="/debts"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            backgroundColor: "#e0e7ff",
            color: "#3730a3",
            fontWeight: 600
          }}
        >
          Долги
        </Link>
        <Link
          href="/planning"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            backgroundColor: "#dcfce7",
            color: "#15803d",
            fontWeight: 600
          }}
        >
          Планирование
        </Link>
        <Link
          href="/reports"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            backgroundColor: "#fef3c7",
            color: "#b45309",
            fontWeight: 600
          }}
        >
          Отчёты
        </Link>
      </nav>

      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Учёт долгов</h1>
        <p style={{ color: "#475569", lineHeight: 1.6 }}>
          Фиксируйте займы общины и автоматически переводите их в USD для общего баланса.
        </p>
      </header>

      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
          borderRadius: "1rem",
          backgroundColor: "#f8fafc"
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a" }}>
          Сводка по обязательствам
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "#64748b" }}>Мы должны</span>
            <strong style={{ color: "#b91c1c", fontSize: "1.1rem" }}>
              {formatUsd(totals.borrowedUsd)}
            </strong>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "#64748b" }}>Нам должны</span>
            <strong style={{ color: "#15803d", fontSize: "1.1rem" }}>
              {formatUsd(totals.lentUsd)}
            </strong>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "#64748b" }}>Баланс</span>
            <strong style={{ color: totals.balanceUsd >= 0 ? "#15803d" : "#b91c1c", fontSize: "1.1rem" }}>
              {formatUsd(totals.balanceUsd)}
            </strong>
          </div>
        </div>
        {totals.currencyEntries.length > 0 ? (
          <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {totals.currencyEntries.map(([itemCurrency, value]) => (
              <li
                key={itemCurrency}
                style={{
                  padding: "0.5rem 0.85rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "#fff7ed",
                  color: value >= 0 ? "#15803d" : "#b91c1c",
                  fontWeight: 600
                }}
              >
                {`${value >= 0 ? "+" : ""}${formatMoney(Math.abs(value), itemCurrency)}`}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <span>Тип</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as Debt["type"])}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db"
            }}
          >
            <option value="borrowed">Мы заняли</option>
            <option value="lent">Мы заняли другим</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <span>Сумма</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db"
            }}
            required
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <span>Валюта</span>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Debt["currency"])}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db"
            }}
          >
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {type === "borrowed" ? (
          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <span>От кого</span>
            <input
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db"
              }}
              required
            />
          </label>
        ) : (
          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <span>Кому</span>
            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db"
              }}
              required
            />
          </label>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <span>Комментарий</span>
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db"
            }}
            placeholder="Необязательно"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.95rem 1.5rem",
            borderRadius: "0.75rem",
            border: "none",
            backgroundColor: loading ? "#1d4ed8" : "#2563eb",
            color: "#ffffff",
            fontWeight: 600,
            transition: "background-color 0.2s ease",
            boxShadow: "0 10px 20px rgba(37, 99, 235, 0.25)"
          }}
        >
          {loading ? "Сохраняем..." : "Сохранить"}
        </button>
      </form>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a" }}>
          Активные долги
        </h2>
        {debts.length === 0 ? (
          <p style={{ color: "#64748b" }}>Пока нет записей.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {debts.map((debt) => (
              <li
                key={debt.id}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "0.85rem",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  alignItems: "flex-start",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <strong style={{ color: "#0f172a" }}>
                    {debt.type === "borrowed" ? "Мы заняли" : "Мы выдали"}
                  </strong>
                  <span style={{ color: "#475569" }}>
                    {new Date(debt.date).toLocaleString("ru-RU")}
                  </span>
                  {debt.comment ? (
                    <span style={{ color: "#475569", lineHeight: 1.4 }}>{debt.comment}</span>
                  ) : null}
                  <span style={{ color: "#475569" }}>
                    {debt.type === "borrowed"
                      ? `От: ${debt.from ?? "не указано"}`
                      : `Кому: ${debt.to ?? "не указано"}`}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "0.5rem",
                    minWidth: "180px"
                  }}
                >
                  <span
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: debt.type === "borrowed" ? "#b91c1c" : "#15803d"
                    }}
                  >
                    {formatMoney(debt.amount, debt.currency)}
                  </span>
                  <span style={{ color: "#475569", fontSize: "0.85rem" }}>
                    ≈ {formatUsd(debt.amountUsd)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(debt.id)}
                    disabled={deletingId === debt.id}
                    style={{
                      padding: "0.55rem 0.95rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #ef4444",
                      backgroundColor: deletingId === debt.id ? "#fecaca" : "#fee2e2",
                      color: "#b91c1c",
                      fontWeight: 600,
                      cursor: deletingId === debt.id ? "not-allowed" : "pointer",
                      transition: "background-color 0.2s ease",
                      boxShadow: "0 10px 18px rgba(239, 68, 68, 0.15)"
                    }}
                  >
                    {deletingId === debt.id ? "Удаляем..." : "Удалить"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default DebtPage;
