"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Goal } from "@/lib/types";

const CURRENCIES: Goal["targetCurrency"][] = ["USD", "RUB", "EUR", "GEL"];

type DeleteGoalResponse = {
  goal: Goal;
  removedOperationsCount: number;
};

const formatMoney = (value: number, currency: Goal["targetCurrency"]) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const PlanningPage = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState<string>("");
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [currency, setCurrency] = useState<Goal["targetCurrency"]>("USD");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/goals");

      if (!response.ok) {
        throw new Error("Не удалось загрузить цели");
      }

      const data = (await response.json()) as Goal[];
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setMessage(null);
    }
  }, []);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  const totals = useMemo(
    () =>
      goals.reduce(
        (acc, goal) => ({
          savedUsd: acc.savedUsd + goal.currentAmountUsd,
          targetUsd: acc.targetUsd + goal.targetAmountUsd
        }),
        { savedUsd: 0, targetUsd: 0 }
      ),
    [goals]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const sanitizedTitle = title.trim();
    const numericTarget = Number(targetAmount);

    if (!sanitizedTitle) {
      setError("Укажите название цели");
      return;
    }

    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      setError("Введите сумму больше нуля");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: sanitizedTitle,
          targetAmount: numericTarget,
          currency
        })
      });

      if (response.status === 409) {
        throw new Error("Цель с таким названием уже существует");
      }

      if (!response.ok) {
        throw new Error("Не удалось сохранить цель");
      }

      const created = (await response.json()) as Goal;
      setGoals((prev) => [created, ...prev]);
      setTitle("");
      setTargetAmount("");
      setCurrency("USD");
      setMessage(`Цель «${created.title}» добавлена.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    setError(null);
    setMessage(null);
    setDeletingId(goalId);

    try {
      const response = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });

      if (response.status === 404) {
        throw new Error("Цель не найдена");
      }

      if (!response.ok) {
        throw new Error("Не удалось удалить цель");
      }

      const result = (await response.json()) as DeleteGoalResponse;

      setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
      await loadGoals().catch(() => undefined);

      const operationsMessage =
        result.removedOperationsCount > 0
          ? ` Также удалено связанных операций: ${result.removedOperationsCount}.`
          : "";

      setMessage(`Цель «${result.goal.title}» удалена.${operationsMessage}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setMessage(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
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
      <main
        style={{
          width: "100%",
          maxWidth: "840px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          padding: "2.5rem 2.75rem",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "2.25rem"
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
        </nav>

        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700 }}>
            Финансовые цели в нескольких валютах
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Фиксируйте цели и отслеживайте прогресс в исходной валюте и в USD.
          </p>
        </header>

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            padding: "1.5rem",
            borderRadius: "1.25rem",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem"
            }}
          >
            <span style={{ fontSize: "1.15rem", fontWeight: 600, color: "#0f172a" }}>
              Общий прогресс по целям
            </span>
            <span style={{ color: "#475569" }}>
              Сохранено {formatUsd(totals.savedUsd)} из {formatUsd(totals.targetUsd)} (USD-экв.)
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "12px",
              borderRadius: "999px",
              backgroundColor: "#e2e8f0",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                width:
                  totals.targetUsd === 0
                    ? "0%"
                    : `${Math.min(100, (totals.savedUsd / totals.targetUsd) * 100).toFixed(1)}%`,
                background:
                  "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(34,197,94,1) 100%)",
                height: "100%"
              }}
            />
          </div>
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
            <span>Название цели</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db"
              }}
              required
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <span>Целевая сумма</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
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
              onChange={(event) => setCurrency(event.target.value as Goal["targetCurrency"])}
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
            {loading ? "Создаём..." : "Создать цель"}
          </button>
        </form>

        {error ? (
          <div
            style={{
              padding: "1rem 1.2rem",
              borderRadius: "0.9rem",
              backgroundColor: "#fee2e2",
              color: "#b91c1c"
            }}
          >
            {error}
          </div>
        ) : null}
        {message ? (
          <div
            style={{
              padding: "1rem 1.2rem",
              borderRadius: "0.9rem",
              backgroundColor: "#dcfce7",
              color: "#166534"
            }}
          >
            {message}
          </div>
        ) : null}

        <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
            Цели и прогресс
          </h2>
          {goals.length === 0 ? (
            <p style={{ color: "#64748b" }}>Добавьте первую цель, чтобы начать планирование.</p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {goals.map((goal) => {
                const progress = goal.targetAmountUsd === 0
                  ? 0
                  : Math.min(100, (goal.currentAmountUsd / goal.targetAmountUsd) * 100);

                return (
                  <li
                    key={goal.id}
                    style={{
                      padding: "1.25rem 1.5rem",
                      borderRadius: "1.1rem",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "1rem",
                        flexWrap: "wrap"
                      }}
                    >
                      <div
                        style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}
                      >
                        <strong style={{ fontSize: "1.25rem", color: "#0f172a" }}>
                          {goal.title}
                        </strong>
                        <span style={{ color: "#475569" }}>
                          Цель: {formatMoney(goal.targetAmount, goal.targetCurrency)}
                        </span>
                        <span style={{ color: "#475569" }}>
                          Сохранено: {formatMoney(goal.currentAmount, goal.targetCurrency)}
                        </span>
                        <span style={{ color: "#475569" }}>
                          Эквивалент: {formatUsd(goal.currentAmountUsd)} из {formatUsd(goal.targetAmountUsd)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(goal.id)}
                        disabled={deletingId === goal.id}
                        style={{
                          padding: "0.6rem 1.1rem",
                          borderRadius: "0.85rem",
                          border: "1px solid #ef4444",
                          backgroundColor: deletingId === goal.id ? "#fecaca" : "#fee2e2",
                          color: "#b91c1c",
                          fontWeight: 600,
                          cursor: deletingId === goal.id ? "not-allowed" : "pointer"
                        }}
                      >
                        {deletingId === goal.id ? "Удаляем..." : "Удалить"}
                      </button>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "10px",
                        borderRadius: "999px",
                        backgroundColor: "#e2e8f0",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${progress.toFixed(1)}%`,
                          height: "100%",
                          backgroundColor: progress >= 100 ? "#22c55e" : "#60a5fa"
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default PlanningPage;
