"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Debt, Goal, Operation, Rate } from "@/lib/types";

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

const CURRENCIES: Operation["currency"][] = ["USD", "RUB", "EUR", "GEL"];

const formatMoney = (value: number, currency: Operation["currency"]) =>
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

const round = (value: number) => Number(value.toFixed(2));

const Page = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<Operation["type"]>("income");
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [currency, setCurrency] = useState<Operation["currency"]>("USD");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [updatingRates, setUpdatingRates] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [operationsResponse, debtsResponse, goalsResponse, ratesResponse] =
          await Promise.all([
            fetch("/api/operations"),
            fetch("/api/debts"),
            fetch("/api/goals"),
            fetch("/api/rates/update")
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

        const [operationsData, debtsData, goalsData, ratesData] = await Promise.all([
          operationsResponse.json() as Promise<Operation[]>,
          debtsResponse.json() as Promise<Debt[]>,
          goalsResponse.json() as Promise<Goal[]>,
          ratesResponse.ok
            ? (ratesResponse.json() as Promise<{ rates: Rate[] }>)
            : Promise.resolve({ rates: [] })
        ]);

        setOperations(operationsData);
        setDebts(debtsData);
        setGoals(goalsData);
        setRates(ratesData.rates ?? []);
        setRatesError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      }
    };

    void loadData();
  }, []);

  const goalCategorySet = useMemo(
    () => new Set(goals.map((goal) => goal.title.toLowerCase())),
    [goals]
  );

  const debtSummary = useMemo(
    () =>
      debts.reduce(
        (acc, debt) => {
          if (debt.status === "closed") {
            return acc;
          }

          if (debt.type === "borrowed") {
            acc.borrowedUsd += debt.amountUsd;
            acc.balanceEffectUsd -= debt.amountUsd;
            acc.byCurrency.set(
              debt.currency,
              round((acc.byCurrency.get(debt.currency) ?? 0) - debt.amount)
            );
            return acc;
          }

          acc.lentUsd += debt.amountUsd;
          acc.balanceEffectUsd += debt.amountUsd;
          acc.byCurrency.set(
            debt.currency,
            round((acc.byCurrency.get(debt.currency) ?? 0) + debt.amount)
          );
          return acc;
        },
        {
          borrowedUsd: 0,
          lentUsd: 0,
          balanceEffectUsd: 0,
          byCurrency: new Map<Operation["currency"], number>()
        }
      ),
    [debts]
  );

  const { balanceEffectUsd } = debtSummary;

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

  const operationsBalanceUsd = useMemo(
    () =>
      operations.reduce((acc, operation) => {
        if (
          operation.type === "expense" &&
          goalCategorySet.has(operation.category.toLowerCase())
        ) {
          return acc;
        }

        return operation.type === "income"
          ? acc + operation.amountUsd
          : acc - operation.amountUsd;
      }, 0),
    [operations, goalCategorySet]
  );

  const balanceUsd = round(operationsBalanceUsd + balanceEffectUsd);

  const currencyBreakdown = useMemo(() => {
    const map = new Map<Operation["currency"], number>();

    for (const operation of operations) {
      if (
        operation.type === "expense" &&
        goalCategorySet.has(operation.category.toLowerCase())
      ) {
        continue;
      }

      const sign = operation.type === "income" ? 1 : -1;
      const current = map.get(operation.currency) ?? 0;
      map.set(operation.currency, round(current + sign * operation.amount));
    }

    for (const debt of debts) {
      if (debt.status === "closed") {
        continue;
      }

      const current = map.get(debt.currency) ?? 0;

      if (debt.type === "borrowed") {
        map.set(debt.currency, round(current - debt.amount));
      } else {
        map.set(debt.currency, round(current + debt.amount));
      }
    }

    return Array.from(map.entries()).filter(([, value]) => value !== 0);
  }, [operations, debts, goalCategorySet]);

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

  const handleRatesUpdate = async () => {
    setUpdatingRates(true);
    setRatesError(null);

    try {
      const response = await fetch("/api/rates/update", { method: "POST" });

      if (!response.ok && response.status !== 207) {
        throw new Error("Не удалось обновить курсы");
      }

      const payload = (await response.json()) as {
        rates: Rate[];
        error?: string;
      };

      setRates(payload.rates);

      if (payload.error) {
        setRatesError(payload.error);
      }
    } catch (err) {
      setRatesError(err instanceof Error ? err.message : "Ошибка при обновлении курсов");
    } finally {
      setUpdatingRates(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    const selectedType = type;
    const selectedCategory = category;
    const selectedCurrency = currency;

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
          currency: selectedCurrency,
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
      setCurrency("USD");
      setCategory(INCOME_CATEGORIES[0]);

      if (
        selectedType === "expense" &&
        goalCategorySet.has(selectedCategory.toLowerCase())
      ) {
        try {
          await reloadGoals();
        } catch {
          // handled through setError
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
            Финансы храма — мультивалюта
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Отслеживайте приход и расход средств в разных валютах. Все суммы автоматически
            конвертируются в USD для консолидации.
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
                Текущий баланс (USD)
              </h2>
              <span style={{ color: "#475569", fontSize: "0.9rem" }}>
                Баланс учитывает долговые обязательства и цели.
              </span>
            </div>
            <strong
              style={{
                fontSize: "1.75rem",
                color: balanceUsd >= 0 ? "#15803d" : "#b91c1c"
              }}
            >
              {formatUsd(balanceUsd)}
            </strong>
          </div>

          {currencyBreakdown.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                padding: "1rem 1.25rem",
                borderRadius: "1rem",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0"
              }}
            >
              <span style={{ fontWeight: 600, color: "#0f172a" }}>
                Эквивалент в исходных валютах
              </span>
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {currencyBreakdown.map(([itemCurrency, value]) => (
                  <li
                    key={itemCurrency}
                    style={{
                      padding: "0.5rem 0.9rem",
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
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <button
              type="button"
              onClick={handleRatesUpdate}
              disabled={updatingRates}
              style={{
                padding: "0.75rem 1.25rem",
                borderRadius: "0.75rem",
                border: "1px solid #0284c7",
                backgroundColor: updatingRates ? "#bae6fd" : "#e0f2fe",
                color: "#075985",
                fontWeight: 600,
                cursor: updatingRates ? "not-allowed" : "pointer",
                transition: "background-color 0.2s ease"
              }}
            >
              {updatingRates ? "Обновляем курсы..." : "Обновить курсы валют"}
            </button>
            {ratesError ? (
              <span style={{ color: "#b91c1c", fontWeight: 500 }}>{ratesError}</span>
            ) : rates.length > 0 ? (
              <span style={{ color: "#475569", fontSize: "0.9rem" }}>
                Актуальные курсы: {rates.map((rate) => `${rate.currency}: ${rate.usdPerUnit.toFixed(4)}`).join(
                  ", "
                )}
              </span>
            ) : null}
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
              <span>Валюта</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Operation["currency"])}
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
                {(type === "income" ? INCOME_CATEGORIES : expenseCategories).map((item) => (
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
                      gap: "0.45rem",
                      minWidth: "180px"
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: operation.type === "income" ? "#15803d" : "#b91c1c",
                        fontSize: "1.1rem"
                      }}
                    >
                      {`${operation.type === "income" ? "+" : "-"}${formatMoney(
                        operation.amount,
                        operation.currency
                      )}`}
                    </span>
                    <span style={{ color: "#475569", fontSize: "0.85rem" }}>
                      ≈ {formatUsd(operation.amountUsd)}
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
