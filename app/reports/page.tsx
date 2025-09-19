"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Operation } from "@/lib/types";

type PeriodOption = "week" | "month" | "year" | "custom";

type CategoryReportRow = {
  category: string;
  incomeUsd: number;
  expenseUsd: number;
  totalUsd: number;
  currencyDetails: Array<{
    currency: Operation["currency"];
    income: number;
    expense: number;
  }>;
};

const PERIOD_OPTIONS: Array<{ value: PeriodOption; label: string }> = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
  { value: "custom", label: "Диапазон" }
];

const SUPPORTED_CURRENCIES: Operation["currency"][] = ["USD", "RUB", "EUR", "GEL"];

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const formatMoney = (value: number, currency: Operation["currency"]) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const ReportsPage = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  useEffect(() => {
    const loadOperations = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/operations");

        if (!response.ok) {
          throw new Error("Не удалось загрузить операции");
        }

        const data = (await response.json()) as Operation[];
        setOperations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setLoading(false);
      }
    };

    void loadOperations();
  }, []);

  const periodRange = useMemo(() => {
    if (selectedPeriod === "custom") {
      const start = customStart ? startOfDay(new Date(customStart)) : null;
      const end = customEnd ? endOfDay(new Date(customEnd)) : null;

      if (start && end && start > end) {
        return { start: end, end: start };
      }

      return { start, end };
    }

    const now = new Date();
    const end = endOfDay(now);

    if (selectedPeriod === "week") {
      return { start: startOfDay(addDays(now, -6)), end };
    }

    if (selectedPeriod === "month") {
      return { start: startOfDay(addDays(now, -30)), end };
    }

    return { start: startOfDay(addDays(now, -365)), end };
  }, [selectedPeriod, customStart, customEnd]);

  const filteredOperations = useMemo(() => {
    const { start, end } = periodRange;

    return operations.filter((operation) => {
      const date = new Date(operation.date);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      if (start && date < start) {
        return false;
      }

      if (end && date > end) {
        return false;
      }

      return true;
    });
  }, [operations, periodRange]);

  const totals = useMemo(() => {
    const summary = filteredOperations.reduce(
      (acc, operation) => {
        if (operation.type === "income") {
          acc.incomeUsd += operation.amountUsd;
          acc.currencyMap.set(
            operation.currency,
            (acc.currencyMap.get(operation.currency) ?? 0) + operation.amount
          );
        } else {
          acc.expenseUsd += operation.amountUsd;
          acc.currencyMap.set(
            operation.currency,
            (acc.currencyMap.get(operation.currency) ?? 0) - operation.amount
          );
        }

        return acc;
      },
      {
        incomeUsd: 0,
        expenseUsd: 0,
        currencyMap: new Map<Operation["currency"], number>()
      }
    );

    return {
      incomeUsd: summary.incomeUsd,
      expenseUsd: summary.expenseUsd,
      balanceUsd: summary.incomeUsd - summary.expenseUsd,
      currencyEntries: Array.from(summary.currencyMap.entries()).filter(([, value]) => value !== 0)
    };
  }, [filteredOperations]);

  const categoryRows = useMemo<CategoryReportRow[]>(() => {
    const map = new Map<
      string,
      {
        incomeUsd: number;
        expenseUsd: number;
        perCurrency: Map<Operation["currency"], { income: number; expense: number }>;
      }
    >();

    for (const operation of filteredOperations) {
      const sanitizedCategory =
        typeof operation.category === "string" && operation.category.trim().length > 0
          ? operation.category.trim()
          : "Без категории";

      const existing = map.get(sanitizedCategory) ?? {
        incomeUsd: 0,
        expenseUsd: 0,
        perCurrency: new Map<Operation["currency"], { income: number; expense: number }>()
      };

      const currencyInfo = existing.perCurrency.get(operation.currency) ?? {
        income: 0,
        expense: 0
      };

      if (operation.type === "income") {
        existing.incomeUsd += operation.amountUsd;
        currencyInfo.income += operation.amount;
      } else {
        existing.expenseUsd += operation.amountUsd;
        currencyInfo.expense += operation.amount;
      }

      existing.perCurrency.set(operation.currency, currencyInfo);
      map.set(sanitizedCategory, existing);
    }

    return Array.from(map.entries())
      .map(([category, info]) => ({
        category,
        incomeUsd: info.incomeUsd,
        expenseUsd: info.expenseUsd,
        totalUsd: info.incomeUsd + info.expenseUsd,
        currencyDetails: Array.from(info.perCurrency.entries()).map(([currency, values]) => ({
          currency,
          income: values.income,
          expense: values.expense
        }))
      }))
      .sort((a, b) => {
        if (b.totalUsd === a.totalUsd) {
          return a.category.localeCompare(b.category);
        }

        return b.totalUsd - a.totalUsd;
      });
  }, [filteredOperations]);

  const maxTotal = useMemo(
    () => categoryRows.reduce((acc, row) => Math.max(acc, row.totalUsd), 0),
    [categoryRows]
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }),
    []
  );

  const rangeLabel = useMemo(() => {
    const { start, end } = periodRange;
    const startLabel = start ? dateFormatter.format(start) : null;
    const endLabel = end ? dateFormatter.format(end) : null;

    if (startLabel && endLabel) {
      return `${startLabel} — ${endLabel}`;
    }

    if (startLabel) {
      return `С ${startLabel}`;
    }

    if (endLabel) {
      return `По ${endLabel}`;
    }

    return "За весь период";
  }, [periodRange, dateFormatter]);

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
            Финансовые отчёты
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Выберите период, чтобы проанализировать приход и расход по категориям, валютам и
            оценить баланс общины в USD.
          </p>
        </header>

        {loading ? (
          <p style={{ color: "#64748b" }}>Загружаем операции...</p>
        ) : error ? (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "0.75rem",
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              fontWeight: 500
            }}
          >
            {error}
          </div>
        ) : (
          <>
            <section
              style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}
              >
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a" }}>
                  Период отчёта
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.75rem"
                  }}
                >
                  {PERIOD_OPTIONS.map((option) => {
                    const isActive = option.value === selectedPeriod;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedPeriod(option.value)}
                        style={{
                          padding: "0.55rem 1.2rem",
                          borderRadius: "999px",
                          border: isActive ? "1px solid #1d4ed8" : "1px solid #cbd5f5",
                          backgroundColor: isActive ? "#1d4ed8" : "#f8fafc",
                          color: isActive ? "#ffffff" : "#0f172a",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out"
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {selectedPeriod === "custom" ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "1rem"
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                        fontSize: "0.95rem",
                        color: "#334155"
                      }}
                    >
                      С
                      <input
                        type="date"
                        value={customStart}
                        onChange={(event) => setCustomStart(event.target.value)}
                        style={{
                          padding: "0.65rem 1rem",
                          borderRadius: "0.75rem",
                          border: "1px solid #d1d5db"
                        }}
                      />
                    </label>
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                        fontSize: "0.95rem",
                        color: "#334155"
                      }}
                    >
                      По
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(event) => setCustomEnd(event.target.value)}
                        style={{
                          padding: "0.65rem 1rem",
                          borderRadius: "0.75rem",
                          border: "1px solid #d1d5db"
                        }}
                      />
                    </label>
                  </div>
                ) : null}
                <span style={{ color: "#475569" }}>{rangeLabel}</span>
              </div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.25rem"
              }}
            >
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "1rem",
                  backgroundColor: "#dcfce7",
                  color: "#166534",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem"
                }}
              >
                <span>Приход (USD)</span>
                <strong style={{ fontSize: "1.5rem" }}>{formatUsd(totals.incomeUsd)}</strong>
              </div>
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "1rem",
                  backgroundColor: "#fee2e2",
                  color: "#b91c1c",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem"
                }}
              >
                <span>Расход (USD)</span>
                <strong style={{ fontSize: "1.5rem" }}>{formatUsd(totals.expenseUsd)}</strong>
              </div>
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "1rem",
                  backgroundColor: "#e0f2fe",
                  color: totals.balanceUsd >= 0 ? "#0369a1" : "#b91c1c",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem"
                }}
              >
                <span>Баланс (USD)</span>
                <strong style={{ fontSize: "1.5rem" }}>{formatUsd(totals.balanceUsd)}</strong>
              </div>
            </section>

            {totals.currencyEntries.length > 0 ? (
              <section
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  padding: "1.25rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  backgroundColor: "#f8fafc"
                }}
              >
                <h3 style={{ fontSize: "1.15rem", fontWeight: 600, color: "#0f172a" }}>
                  Эквивалент по валютам
                </h3>
                <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  {SUPPORTED_CURRENCIES.map((currency) => {
                    const match = totals.currencyEntries.find(([itemCurrency]) => itemCurrency === currency);

                    if (!match) {
                      return null;
                    }

                    const [, value] = match;
                    return (
                      <li
                        key={currency}
                        style={{
                          padding: "0.5rem 0.85rem",
                          borderRadius: "0.75rem",
                          backgroundColor: "#fff7ed",
                          color: value >= 0 ? "#15803d" : "#b91c1c",
                          fontWeight: 600
                        }}
                      >
                        {`${value >= 0 ? "+" : ""}${formatMoney(Math.abs(value), currency)}`}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
                Категории
              </h2>
              {categoryRows.length === 0 ? (
                <p style={{ color: "#64748b" }}>Нет операций в выбранном периоде.</p>
              ) : (
                <ul style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {categoryRows.map((row) => {
                    const share = maxTotal === 0 ? 0 : (row.totalUsd / maxTotal) * 100;

                    return (
                      <li
                        key={row.category}
                        style={{
                          padding: "1.2rem 1.4rem",
                          borderRadius: "1rem",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem"
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
                            <strong style={{ color: "#0f172a", fontSize: "1.15rem" }}>
                              {row.category}
                            </strong>
                            <span style={{ color: "#15803d" }}>
                              Приход: {formatUsd(row.incomeUsd)}
                            </span>
                            <span style={{ color: "#b91c1c" }}>
                              Расход: {formatUsd(row.expenseUsd)}
                            </span>
                          </div>
                          <span style={{ color: "#475569", fontSize: "0.95rem" }}>
                            Доля от всех операций: {share.toFixed(1)}%
                          </span>
                        </div>
                        {row.currencyDetails.length > 0 ? (
                          <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
                            {row.currencyDetails.map((detail) => {
                              const parts: string[] = [];

                              if (detail.income !== 0) {
                                parts.push(`+${formatMoney(detail.income, detail.currency)}`);
                              }

                              if (detail.expense !== 0) {
                                parts.push(`-${formatMoney(Math.abs(detail.expense), detail.currency)}`);
                              }

                              const label =
                                parts.length > 0 ? parts.join(" / ") : formatMoney(0, detail.currency);

                              return (
                                <li
                                  key={`${row.category}-${detail.currency}`}
                                  style={{
                                    padding: "0.45rem 0.75rem",
                                    borderRadius: "0.75rem",
                                    backgroundColor: "#fff7ed",
                                    color: "#0f172a",
                                    fontSize: "0.85rem"
                                  }}
                                >
                                  {detail.currency}: {label}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default ReportsPage;
