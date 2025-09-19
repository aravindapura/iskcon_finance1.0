"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Debt, Operation } from "@/lib/types";

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
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<Operation["type"]>("income");
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOperations = async () => {
      try {
        const [operationsResponse, debtsResponse] = await Promise.all([
          fetch("/api/operations"),
          fetch("/api/debts")
        ]);

        if (!operationsResponse.ok) {
          throw new Error("Не удалось загрузить операции");
        }

        if (!debtsResponse.ok) {
          throw new Error("Не удалось загрузить данные по долгам");
        }

        const [operationsData, debtsData] = await Promise.all([
          operationsResponse.json() as Promise<Operation[]>,
          debtsResponse.json() as Promise<Debt[]>
        ]);

        setOperations(operationsData);
        setDebts(debtsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      }
    };

    void loadOperations();
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

  const balance = useMemo(() => {
    const operationsBalance = operations.reduce((acc, operation) => {
      return operation.type === "income"
        ? acc + operation.amount
        : acc - operation.amount;
    }, 0);

    return operationsBalance + balanceEffect;
  }, [operations, balanceEffect]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const numericAmount = Number(amount);

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
          type,
          amount: numericAmount,
          category
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

      setOperations((prev) => prev.filter((operation) => operation.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeletingId(null);
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
      <nav style={{ display: "flex", gap: "1rem" }}>
        <Link
          href="/"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            backgroundColor: "#e0e7ff",
            color: "#1d4ed8",
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
            backgroundColor: "#eef2ff",
            color: "#4338ca",
            fontWeight: 600
          }}
        >
          Долги
        </Link>
      </nav>

      <header style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Финансы храма — MVP</h1>
        <p style={{ color: "#4b5563" }}>
          Отслеживайте приход и расход средств, чтобы понимать финансовый баланс общины.
        </p>
      </header>

      <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Текущий баланс</h2>
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
            gridTemplateColumns: "2fr 1fr 1.5fr auto",
            gap: "1rem",
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
                setCategory(
                  (newType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0]
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
              {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
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
              padding: "0.85rem 1.75rem",
              borderRadius: "0.75rem",
              border: "none",
              backgroundColor: loading ? "#1d4ed8" : "#2563eb",
              color: "#ffffff",
              fontWeight: 600,
              transition: "background-color 0.2s ease"
            }}
          >
            {loading ? "Добавляем..." : "Добавить"}
          </button>
        </form>

        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Последние операции</h2>
        {operations.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Пока нет данных — добавьте первую операцию.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {operations.map((operation) => (
              <li
                key={operation.id}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "1rem",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  backgroundColor: "#f9fafb"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <p style={{ fontWeight: 600 }}>
                    {operation.type === "income" ? "Приход" : "Расход"} — {operation.category}
                  </p>
                  <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                    {new Date(operation.date).toLocaleString("ru-RU")}
                  </p>
                  {operation.comment ? (
                    <p style={{ color: "#4b5563" }}>{operation.comment}</p>
                  ) : null}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem"
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: operation.type === "income" ? "#15803d" : "#b91c1c"
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
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #ef4444",
                      backgroundColor: deletingId === operation.id ? "#fca5a5" : "#fee2e2",
                      color: "#b91c1c",
                      fontWeight: 600,
                      cursor: deletingId === operation.id ? "not-allowed" : "pointer"
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
  );
};

export default Page;
