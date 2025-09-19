"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Debt, Goal, Operation } from "@/lib/types";

const INCOME_CATEGORIES = [
  "йога",
  "ящик для пожертвований",
  "личное пожертвование",
  "харинама",
  "продажа книг",
  "прочее"
] as const;

const EXPENSE_CATEGORIES = [
  "аренда",
  "коммунальные",
  "газ",
  "прасад",
  "быт",
  "цветы",
  "развитие",
  "прочее"
] as const;

const Page = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<Operation["type"]>("income");
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [operationsResponse, debtsResponse, goalsResponse] = await Promise.all([
          fetch("/api/operations"),
          fetch("/api/debts"),
          fetch("/api/goals")
        ]);

        if (!operationsResponse.ok) {
          throw new Error("Не удалось загрузить операции");
        }

        if (!debtsResponse.ok) {
          throw new Error("Не удалось загрузить данные по долгам");
        }

        if (!goalsResponse.ok) {
          throw new Error("Не удалось загрузить цели");
        }

        const [operationsData, debtsData, goalsData] = await Promise.all([
          operationsResponse.json() as Promise<Operation[]>,
          debtsResponse.json() as Promise<Debt[]>,
          goalsResponse.json() as Promise<Goal[]>
        ]);

        setOperations(operationsData);
        setDebts(debtsData);
        setGoals(goalsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      }
    };

    void loadData();
  }, []);

  const debtSummary = useMemo(
    () =>
      debts.reduce(
        (acc, debt) => {
          if (debt.status === "closed") {
            return acc;
          }

          if (debt.type === "borrowed") {
            return {
              ...acc,
              borrowed: acc.borrowed + debt.amount,
              balanceEffect: acc.balanceEffect - debt.amount
            };
          }

          return {
            ...acc,
            lent: acc.lent + debt.amount,
            balanceEffect: acc.balanceEffect + debt.amount
          };
        },
        { borrowed: 0, lent: 0, balanceEffect: 0 }
      ),
    [debts]
  );

  const { balanceEffect } = debtSummary;

  const expenseCategories = useMemo(
    () =>
      Array.from(
        new Set([
          ...EXPENSE_CATEGORIES,
          ...goals.map((goal) => goal.title)
        ])
      ),
    [goals]
  );

  const goalCategorySet = useMemo(
    () => new Set(goals.map((goal) => goal.title.toLowerCase())),
    [goals]
  );

  const balance = useMemo(() => {
    const operationsBalance = operations.reduce((acc, operation) => {
      if (operation.type === "expense" && goalCategorySet.has(operation.category.toLowerCase())) {
        return acc;
      }

      return operation.type === "income"
        ? acc + operation.amount
        : acc - operation.amount;
    }, 0);

    return operationsBalance + balanceEffect;
  }, [operations, balanceEffect, goalCategorySet]);

  const reloadGoals = async () => {
    try {
      const response = await fetch("/api/goals");

      if (!response.ok) {
        throw new Error("Не удалось загрузить цели");
      }

      const data = (await response.json()) as Goal[];
      setGoals(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      throw err;
    }
  };

  useEffect(() => {
    if (type === "expense" && !expenseCategories.includes(category)) {
      const fallbackCategory = expenseCategories[0] ?? EXPENSE_CATEGORIES[0];
      setCategory(fallbackCategory);
      return;
    }

    if (
      type === "income" &&
      !INCOME_CATEGORIES.includes(category as (typeof INCOME_CATEGORIES)[number])
    ) {
      setCategory(INCOME_CATEGORIES[0]);
    }
  }, [type, category, expenseCategories]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    const selectedType = type;
    const selectedCategory = category;

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Введите корректную сумму больше нуля");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/operations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: selectedType,
          amount: numericAmount,
          category: selectedCategory
        })
      });

      if (!response.ok) {
        throw new Error("Не удалось сохранить операцию");
      }

      const created = (await response.json()) as Operation;
      setOperations((prev) => [created, ...prev]);
      setAmount("");
      setType("income");
      setCategory(INCOME_CATEGORIES[0]);

      if (
        selectedType === "expense" &&
        goalCategorySet.has(selectedCategory.toLowerCase())
      ) {
        try {
          await reloadGoals();
        } catch {
          // Ошибка уже отображается пользователю через setError
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/operations/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Не удалось удалить операцию");
      }

      const deleted = (await response.json()) as Operation;

      setOperations((prev) => prev.filter((operation) => operation.id !== id));

      if (deleted.type === "expense" && goalCategorySet.has(deleted.category.toLowerCase())) {
        void reloadGoals().catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#e2e8f0",
        padding: "3rem 1.5rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start"
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "880px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          padding: "2.5rem 2.75rem",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "2.5rem"
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
        </nav>

        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700 }}>
            Финансы храма — MVP
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Отслеживайте приход и расход средств, чтобы понимать финансовый баланс общины.
          </p>
        </header>

        <section style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
              Текущий баланс
            </h2>
            <strong
              style={{
                fontSize: "1.75rem",
                color: balance >= 0 ? "#15803d" : "#b91c1c"
              }}
            >
              {balance.toLocaleString("ru-RU", {
                style: "currency",
                currency: "USD"
              })}
            </strong>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              alignItems: "end"
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Тип</span>
              <select
                value={type}
                onChange={(event) => {
                  const newType = event.target.value as Operation["type"];
                  setType(newType);
                  const defaultExpenseCategory = expenseCategories[0] ?? EXPENSE_CATEGORIES[0];
                  setCategory(
                    newType === "income"
                      ? INCOME_CATEGORIES[0]
                      : defaultExpenseCategory
                  );
                }}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #d1d5db"
                }}
              >
                <option value="income">Приход</option>
                <option value="expense">Расход</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Категория</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #d1d5db"
                }}
              >
                {(type === "income" ? INCOME_CATEGORIES : expenseCategories).map(
                  (item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  )
                )}
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
                boxShadow: "0 10px 20px rgba(37, 99, 235, 0.25)",
                width: "100%"
              }}
            >
              {loading ? "Добавляем..." : "Добавить"}
            </button>
          </form>

          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
            Последние операции
          </h2>
          {operations.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              Пока нет данных — добавьте первую операцию.
            </p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {operations.map((operation) => (
                <li
                  key={operation.id}
                  style={{
                    padding: "1.1rem 1.35rem",
                    borderRadius: "1rem",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1.25rem",
                    backgroundColor: "#f8fafc",
                    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
                    flexWrap: "wrap"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                      minWidth: "220px"
                    }}
                  >
                    <p style={{ fontWeight: 600, color: "#0f172a" }}>
                      {operation.type === "income" ? "Приход" : "Расход"} — {operation.category}
                    </p>
                    <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                      {new Date(operation.date).toLocaleString("ru-RU")}
                    </p>
                    {operation.comment ? (
                      <p style={{ color: "#475569", lineHeight: 1.5 }}>{operation.comment}</p>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "0.65rem",
                      minWidth: "140px"
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: operation.type === "income" ? "#15803d" : "#b91c1c",
                        fontSize: "1.1rem"
                      }}
                    >
                      {`${operation.type === "income" ? "+" : "-"}${operation.amount.toLocaleString(
                        "ru-RU",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }
                      )} ${operation.currency}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(operation.id)}
                      disabled={deletingId === operation.id}
                      style={{
                        padding: "0.55rem 0.95rem",
                        borderRadius: "0.75rem",
                        border: "1px solid #ef4444",
                        backgroundColor: deletingId === operation.id ? "#fecaca" : "#fee2e2",
                        color: "#b91c1c",
                        fontWeight: 600,
                        cursor: deletingId === operation.id ? "not-allowed" : "pointer",
                        transition: "background-color 0.2s ease, transform 0.2s ease",
                        boxShadow: "0 10px 18px rgba(239, 68, 68, 0.15)",
                        width: "100%"
                      }}
                    >
                      {deletingId === operation.id ? "Удаляем..." : "Удалить"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default Page;
