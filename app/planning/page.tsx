"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import { convertFromBase, DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Currency, Goal, Settings } from "@/lib/types";

type DeleteGoalResponse = {
  goal: Goal;
  removedOperationsCount: number;
};

const PlanningContent = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "accountant";

  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState<string>("");
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>(DEFAULT_SETTINGS.baseCurrency);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/goals");

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        throw new Error("Сессия истекла");
      }

      if (!response.ok) {
        throw new Error("Не удалось загрузить цели");
      }

      const data = (await response.json()) as Goal[];
      setGoals(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setMessage(null);
      throw err;
    }
  }, [refresh]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const load = async () => {
      setInitialLoading(true);
      setError(null);
      setMessage(null);

      try {
        const response = await fetch("/api/settings");

        if (response.status === 401) {
          setError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (!response.ok) {
          throw new Error("Не удалось загрузить настройки");
        }

        const data = (await response.json()) as Settings;
        setSettings(data);
        setCurrency(data.baseCurrency);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setInitialLoading(false);
      }
    };

    void load();
  }, [user, refresh]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadGoals().catch(() => undefined);
  }, [user, loadGoals]);

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

  const activeSettings = settings ?? DEFAULT_SETTINGS;
  const baseCurrencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: activeSettings.baseCurrency
      }),
    [activeSettings.baseCurrency]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!canManage) {
      setError("Недостаточно прав для добавления цели");
      return;
    }

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

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для добавления цели");
        return;
      }

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
    if (!canManage) {
      setError("Недостаточно прав для удаления цели");
      setMessage(null);
      return;
    }

    setError(null);
    setMessage(null);
    setDeletingId(goalId);

    try {
      const response = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для удаления цели");
        return;
      }

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
    <PageContainer activeTab="planning">
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
          Планирование проектов и целей
        </h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Следите за прогрессом накоплений по ключевым инициативам общины.
        </p>
      </header>

        <section
          data-layout="stat-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem"
          }}
        >
          <article
            style={{
              backgroundColor: "var(--surface-indigo)",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 16px 35px rgba(99, 102, 241, 0.12)"
            }}
          >
            <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Сохранено
            </h2>
            <strong style={{ fontSize: "1.5rem", color: "var(--accent-indigo-strong)" }}>
              {baseCurrencyFormatter.format(totals.saved)}
            </strong>
          </article>
          <article
            style={{
              backgroundColor: "var(--surface-success)",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 16px 35px rgba(34, 197, 94, 0.12)"
            }}
          >
            <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Цель
            </h2>
            <strong style={{ fontSize: "1.5rem", color: "var(--accent-success)" }}>
              {baseCurrencyFormatter.format(totals.target)}
            </strong>
          </article>
        </section>

        <form
          onSubmit={handleSubmit}
          data-layout="responsive-form"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem"
          }}
        >
          <label>
            <span>Название цели</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!canManage || loading}
              placeholder="Например, фестиваль Гауранги"
            />
          </label>

          <label>
            <span>Сумма</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              disabled={!canManage || loading}
              placeholder="0.00"
            />
          </label>

          <label>
            <span>Валюта</span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
              disabled={!canManage || loading}
            >
              {SUPPORTED_CURRENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={!canManage || loading}
            data-variant="primary"
          >
            {loading ? "Добавляем..." : "Добавить цель"}
          </button>
        </form>

        {!canManage ? (
          <p style={{ color: "var(--text-muted)" }}>
            Вы вошли как наблюдатель — цели доступны только для просмотра.
          </p>
        ) : null}

        {initialLoading ? <p style={{ color: "var(--text-muted)" }}>Загружаем данные...</p> : null}

        {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
        {message ? <p style={{ color: "var(--accent-success)" }}>{message}</p> : null}

        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Активные цели
          </h2>
          {goals.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              Пока нет активных целей.
            </p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              {goals.map((goal) => {
                const target = convertFromBase(goal.targetAmount, goal.currency, activeSettings);
                const current = convertFromBase(goal.currentAmount, goal.currency, activeSettings);
                const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

                return (
                  <li
                    key={goal.id}
                    style={{
                      border: "1px solid var(--border-strong)",
                      borderRadius: "var(--radius-2xl)",
                      padding: "1rem",
                      backgroundColor: "var(--surface-subtle)",
                      boxShadow: "var(--shadow-card)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem"
                    }}
                  >
                    <div
                      data-card="split"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "1rem",
                        flexWrap: "wrap"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <strong style={{ fontSize: "1.1rem" }}>
                          {goal.title}
                        </strong>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                          Сохранено: {baseCurrencyFormatter.format(goal.currentAmount)} из {baseCurrencyFormatter.format(goal.targetAmount)}
                        </span>
                      </div>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(goal.id)}
                          disabled={deletingId === goal.id}
                          data-variant="danger"
                        >
                          {deletingId === goal.id ? "Удаляем..." : "Удалить"}
                        </button>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem"
                      }}
                    >
                      <div
                        style={{
                          height: "0.75rem",
                          borderRadius: "999px",
                          backgroundColor: "var(--border-strong)",
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            backgroundColor: "var(--accent-primary)",
                            height: "100%"
                          }}
                        />
                      </div>
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {progress}% — {current.toLocaleString("ru-RU", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}{" "}
                        {goal.currency} накоплено
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
    </PageContainer>
  );
};

const PlanningPage = () => (
  <AuthGate>
    <PlanningContent />
  </AuthGate>
);

export default PlanningPage;
