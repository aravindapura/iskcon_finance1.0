"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Goal } from "@/lib/types";

type DeleteGoalResponse = {
  goal: Goal;
  removedOperationsCount: number;
};

const PlanningPage = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState<string>("");
  const [targetAmount, setTargetAmount] = useState<string>("");
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
          saved: acc.saved + goal.currentAmount,
          target: acc.target + goal.targetAmount
        }),
        { saved: 0, target: 0 }
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
          targetAmount: numericTarget
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
              backgroundColor: "#bbf7d0",
              color: "#166534",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(34, 197, 94, 0.25)"
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



        <header style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700 }}>Цели и планирование</h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Сохраняйте финансовые цели общины и отслеживайте прогресс по сбору средств.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gap: "1.25rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
          }}
        >
          <div
            style={{
              padding: "1.2rem 1.5rem",
              borderRadius: "1rem",
              backgroundColor: "#ecfdf5",
              border: "1px solid #bbf7d0",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem"
            }}
          >
            <span style={{ color: "#047857", fontWeight: 600, fontSize: "0.95rem" }}>
              Сохранено
            </span>
            <strong style={{ fontSize: "1.65rem", color: "#065f46" }}>
              {totals.saved.toLocaleString("ru-RU", {
                style: "currency",
                currency: "USD"
              })}
            </strong>
          </div>
          <div
            style={{
              padding: "1.2rem 1.5rem",
              borderRadius: "1rem",
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem"
            }}
          >
            <span style={{ color: "#1d4ed8", fontWeight: 600, fontSize: "0.95rem" }}>
              Цели по сбору
            </span>
            <strong style={{ fontSize: "1.65rem", color: "#1e3a8a" }}>
              {totals.target.toLocaleString("ru-RU", {
                style: "currency",
                currency: "USD"
              })}
            </strong>
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
            Добавить новую цель
          </h2>
          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              alignItems: "end"
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Название цели</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #d1d5db"
                }}
                placeholder="Например, ремонт храма"
                required
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Сумма</span>
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
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.95rem 1.5rem",
                borderRadius: "0.75rem",
                border: "none",
                backgroundColor: loading ? "#16a34a" : "#22c55e",
                color: "#ffffff",
                fontWeight: 600,
                transition: "background-color 0.2s ease",
                boxShadow: "0 10px 20px rgba(34, 197, 94, 0.25)",
                width: "100%"
              }}
            >
              {loading ? "Сохраняем..." : "Добавить цель"}
            </button>
          </form>
          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
          {message ? <p style={{ color: "#166534" }}>{message}</p> : null}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
            Текущие цели
          </h2>
          {goals.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              Целей пока нет. Добавьте первую, чтобы начать планирование.
            </p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {goals.map((goal) => {
                const progress = goal.targetAmount
                  ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                  : 0;
                const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

                return (
                  <li
                    key={goal.id}
                    style={{
                      padding: "1.25rem 1.5rem",
                      borderRadius: "1rem",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "1rem",
                        alignItems: "flex-start",
                        flexWrap: "wrap"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "1rem",
                          flex: "1 1 240px"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a" }}>
                            {goal.title}
                          </h3>
                          <span style={{ color: "#475569", fontSize: "0.95rem" }}>
                            {goal.status === "done" ? "Цель достигнута" : "В процессе"}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <strong style={{ color: "#047857" }}>
                            {goal.currentAmount.toLocaleString("ru-RU", {
                              style: "currency",
                              currency: "USD"
                            })}
                          </strong>
                          <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                            из {goal.targetAmount.toLocaleString("ru-RU", {
                              style: "currency",
                              currency: "USD"
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDelete(goal.id);
                        }}
                        disabled={deletingId === goal.id}
                        style={{
                          padding: "0.5rem 0.9rem",
                          borderRadius: "0.75rem",
                          border: "none",
                          backgroundColor: "#f87171",
                          color: "#ffffff",
                          fontWeight: 600,
                          boxShadow: "0 6px 18px rgba(248, 113, 113, 0.35)",
                          cursor: deletingId === goal.id ? "not-allowed" : "pointer",
                          transition: "opacity 0.2s ease"
                        }}
                      >
                        {deletingId === goal.id ? "Удаляем..." : "Удалить"}
                      </button>
                    </div>
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "0.85rem",
                        borderRadius: "999px",
                        backgroundColor: "#e2e8f0",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          transform: `scaleX(${progress / 100})`,
                          transformOrigin: "left",
                          background: "linear-gradient(90deg, #22c55e, #16a34a)",
                          transition: "transform 0.3s ease"
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.9rem",
                        color: "#475569"
                      }}
                    >
                      <span>Прогресс: {progress.toFixed(0)}%</span>
                      <span>
                        Осталось собрать: {remaining.toLocaleString("ru-RU", {
                          style: "currency",
                          currency: "USD"
                        })}
                      </span>
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
