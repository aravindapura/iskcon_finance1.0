"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { convertToBase, DEFAULT_SETTINGS } from "@/lib/currency";
import type { Operation, Settings } from "@/lib/types";

type PeriodOption = "week" | "month" | "year" | "custom";

type CategoryReportRow = {
  category: string;
  income: number;
  expense: number;
  total: number;
};

const PERIOD_OPTIONS: Array<{ value: PeriodOption; label: string }> = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
  { value: "custom", label: "Диапазон" }
];

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

const ReportsPage = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadOperations = async () => {
      setLoading(true);
      setError(null);

      try {
        const [operationsResponse, settingsResponse] = await Promise.all([
          fetch("/api/operations"),
          fetch("/api/settings")
        ]);

        if (!operationsResponse.ok) {
          throw new Error("Не удалось загрузить операции");
        }

        if (!settingsResponse.ok) {
          throw new Error("Не удалось загрузить настройки");
        }

        const [operationsData, settingsData] = await Promise.all([
          operationsResponse.json() as Promise<Operation[]>,
          settingsResponse.json() as Promise<Settings>
        ]);

        setOperations(operationsData);
        setSettings(settingsData);
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

  const activeSettings = settings ?? DEFAULT_SETTINGS;

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: activeSettings.baseCurrency
      }),
    [activeSettings.baseCurrency]
  );

  const totals = useMemo(() => {
    const summary = filteredOperations.reduce(
      (acc, operation) => {
        const amountInBase = convertToBase(operation.amount, operation.currency, activeSettings);

        if (operation.type === "income") {
          acc.income += amountInBase;
        } else {
          acc.expense += amountInBase;
        }

        return acc;
      },
      { income: 0, expense: 0 }
    );

    return {
      income: summary.income,
      expense: summary.expense,
      balance: summary.income - summary.expense
    };
  }, [filteredOperations, activeSettings]);

  const categoryRows = useMemo<CategoryReportRow[]>(() => {
    const map = new Map<string, { income: number; expense: number }>();

    for (const operation of filteredOperations) {
      const sanitizedCategory =
        typeof operation.category === "string" && operation.category.trim().length > 0
          ? operation.category.trim()
          : "Без категории";
      const current = map.get(sanitizedCategory) ?? { income: 0, expense: 0 };
      const amountInBase = convertToBase(operation.amount, operation.currency, activeSettings);

      if (operation.type === "income") {
        current.income += amountInBase;
      } else {
        current.expense += amountInBase;
      }

      map.set(sanitizedCategory, current);
    }

    return Array.from(map.entries())
      .map(([category, { income, expense }]) => ({
        category,
        income,
        expense,
        total: income + expense
      }))
      .sort((a, b) => {
        if (b.total === a.total) {
          return a.category.localeCompare(b.category);
        }

        return b.total - a.total;
      });
  }, [filteredOperations, activeSettings]);

  const maxTotal = useMemo(
    () => categoryRows.reduce((acc, row) => Math.max(acc, row.total), 0),
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

  const handleExportPdf = useCallback(async () => {
    if (loading || error) {
      return;
    }

    setIsExporting(true);

    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    try {
      const summaryRows = [
        { label: "Приход", value: currencyFormatter.format(totals.income) },
        { label: "Расход", value: currencyFormatter.format(totals.expense) },
        { label: "Баланс", value: currencyFormatter.format(totals.balance) }
      ];

      const generatedAt = new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "long",
        timeStyle: "short"
      }).format(new Date());

      const summaryHtml = summaryRows
        .map(
          (row) => `
            <div class="summary-item">
              <span class="summary-label">${row.label}</span>
              <span class="summary-value">${escapeHtml(row.value)}</span>
            </div>
          `
        )
        .join("");

      const tableRowsHtml =
        categoryRows.length > 0
          ? categoryRows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.category)}</td>
                    <td>${escapeHtml(currencyFormatter.format(row.income))}</td>
                    <td>${escapeHtml(currencyFormatter.format(row.expense))}</td>
                    <td>${escapeHtml(currencyFormatter.format(row.total))}</td>
                  </tr>
                `
              )
              .join("")
          : `
              <tr>
                <td colspan="4" style="text-align:center; color:#64748b;">
                  Нет данных для выбранного периода
                </td>
              </tr>
            `;

      const printWindow = window.open("", "_blank", "width=900,height=700");

      if (!printWindow) {
        return;
      }

      printWindow.document.write(`
      <!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <title>Финансовый отчёт</title>
          <style>
            :root { color-scheme: light; }
            @page { margin: 25mm; }
            * { box-sizing: border-box; }
            body {
              font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              margin: 0;
              padding: 32px 40px 40px;
              color: #0f172a;
              background: #ffffff;
            }
            h1 {
              font-size: 28px;
              margin: 0;
              color: #0f172a;
            }
            h2 {
              font-size: 18px;
              margin: 32px 0 16px;
              color: #0f172a;
            }
            p {
              margin: 0;
            }
            .report-header {
              margin-bottom: 24px;
            }
            .report-meta {
              margin-top: 8px;
              color: #475569;
              font-size: 14px;
            }
            .summary {
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              margin-bottom: 16px;
            }
            .summary-item {
              flex: 1 1 180px;
              background: #f1f5f9;
              padding: 14px 16px;
              border-radius: 14px;
            }
            .summary-label {
              display: block;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.08em;
              color: #475569;
            }
            .summary-value {
              display: block;
              margin-top: 6px;
              font-size: 18px;
              font-weight: 600;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            thead th {
              background: #1d4ed8;
              color: #ffffff;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              font-size: 11px;
              padding: 12px;
              text-align: left;
            }
            tbody td {
              padding: 12px;
              font-size: 13px;
              border-bottom: 1px solid #e2e8f0;
            }
            tbody tr:nth-child(even) {
              background: #f8fafc;
            }
            .footer-note {
              margin-top: 32px;
              font-size: 12px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <main>
            <header class="report-header">
              <h1>Финансовый отчёт</h1>
              <p class="report-meta">Период: ${escapeHtml(rangeLabel)}</p>
              <p class="report-meta">Сформировано: ${escapeHtml(generatedAt)}</p>
            </header>
            <section class="summary">
              ${summaryHtml}
            </section>
            <section>
              <h2>Движение по категориям</h2>
              <table>
                <thead>
                  <tr>
                    <th>Категория</th>
                    <th>Приход</th>
                    <th>Расход</th>
                    <th>Всего</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>
            </section>
            <p class="footer-note">
              Отчёт сформирован автоматически системой учёта ISKCON Finance.
            </p>
          </main>
          <script>
            window.addEventListener('load', () => {
              window.print();
              window.close();
            });
          </script>
        </body>
      </html>
    `);

      printWindow.document.close();
      printWindow.focus();
    } finally {
      setIsExporting(false);
    }
  }, [categoryRows, currencyFormatter, error, loading, rangeLabel, totals]);

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
          <Link
            href="/settings"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: "#ede9fe",
              color: "#6d28d9",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(109, 40, 217, 0.2)"
            }}
          >
            Настройки
          </Link>
        </nav>

        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.25rem"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 700 }}>
              Финансовые отчёты
            </h1>
            <p style={{ color: "#475569", lineHeight: 1.6 }}>
              Выберите период, чтобы проанализировать приход и расход по категориям и
              оценить баланс общины.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleExportPdf();
            }}
            disabled={loading || Boolean(error) || isExporting}
            style={{
              padding: "0.75rem 1.8rem",
              borderRadius: "999px",
              border: "none",
              background: loading || error
                ? "#cbd5f5"
                : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              color: loading || error ? "#475569" : "#ffffff",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: loading || error || isExporting ? "not-allowed" : "pointer",
              boxShadow: loading || error
                ? "none"
                : "0 18px 30px rgba(59, 130, 246, 0.25)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
              opacity: loading || error ? 0.6 : 1
            }}
          >
            {isExporting ? "Формируем PDF..." : "Экспорт в PDF"}
          </button>
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
                          padding: "0.55rem 0.75rem",
                          borderRadius: "0.65rem",
                          border: "1px solid #cbd5f5",
                          backgroundColor: "#f8fafc",
                          fontSize: "0.95rem"
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
                          padding: "0.55rem 0.75rem",
                          borderRadius: "0.65rem",
                          border: "1px solid #cbd5f5",
                          backgroundColor: "#f8fafc",
                          fontSize: "0.95rem"
                        }}
                      />
                    </label>
                  </div>
                ) : null}
                <span style={{ color: "#475569", fontSize: "0.95rem" }}>{rangeLabel}</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem"
                }}
              >
                <div
                  style={{
                    padding: "1.2rem 1.4rem",
                    borderRadius: "1rem",
                    backgroundColor: "#dcfce7",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem"
                  }}
                >
                  <span style={{ color: "#166534", fontWeight: 600, fontSize: "0.95rem" }}>
                    Приход
                  </span>
                  <strong style={{ fontSize: "1.4rem", color: "#166534" }}>
                    {currencyFormatter.format(totals.income)}
                  </strong>
                </div>
                <div
                  style={{
                    padding: "1.2rem 1.4rem",
                    borderRadius: "1rem",
                    backgroundColor: "#fee2e2",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem"
                  }}
                >
                  <span style={{ color: "#b91c1c", fontWeight: 600, fontSize: "0.95rem" }}>
                    Расход
                  </span>
                  <strong style={{ fontSize: "1.4rem", color: "#b91c1c" }}>
                    {currencyFormatter.format(totals.expense)}
                  </strong>
                </div>
                <div
                  style={{
                    padding: "1.2rem 1.4rem",
                    borderRadius: "1rem",
                    backgroundColor: "#e0f2fe",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem"
                  }}
                >
                  <span style={{ color: "#0369a1", fontWeight: 600, fontSize: "0.95rem" }}>
                    Баланс
                  </span>
                  <strong
                    style={{
                      fontSize: "1.4rem",
                      color: totals.balance >= 0 ? "#0369a1" : "#b91c1c"
                    }}
                  >
                    {currencyFormatter.format(totals.balance)}
                  </strong>
                </div>
              </div>
            </section>

            {categoryRows.length === 0 ? (
              <p style={{ color: "#475569" }}>Нет данных для отчёта</p>
            ) : (
              <section
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "1.75rem"
                }}
              >
                <div
                  style={{
                    borderRadius: "1rem",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden"
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", textAlign: "left" }}>
                        <th
                          style={{
                            padding: "0.85rem 1rem",
                            fontSize: "0.85rem",
                            color: "#475569",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em"
                          }}
                        >
                          Категория
                        </th>
                        <th
                          style={{
                            padding: "0.85rem 1rem",
                            fontSize: "0.85rem",
                            color: "#475569",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em"
                          }}
                        >
                          Приход
                        </th>
                        <th
                          style={{
                            padding: "0.85rem 1rem",
                            fontSize: "0.85rem",
                            color: "#475569",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em"
                          }}
                        >
                          Расход
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRows.map((row) => (
                        <tr
                          key={row.category}
                          style={{ borderTop: "1px solid #e2e8f0" }}
                        >
                          <td style={{ padding: "0.8rem 1rem", color: "#0f172a" }}>
                            {row.category}
                          </td>
                          <td style={{ padding: "0.8rem 1rem", color: "#166534" }}>
                            {currencyFormatter.format(row.income)}
                          </td>
                          <td style={{ padding: "0.8rem 1rem", color: "#b91c1c" }}>
                            {currencyFormatter.format(row.expense)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem"
                  }}
                >
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#0f172a" }}>
                    Распределение по категориям
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem"
                    }}
                  >
                    {categoryRows.map((row) => {
                      const width = maxTotal > 0 ? Math.round((row.total / maxTotal) * 100) : 0;

                      return (
                        <div
                          key={row.category}
                          style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              color: "#0f172a",
                              fontSize: "0.95rem",
                              fontWeight: 500
                            }}
                          >
                            <span>{row.category}</span>
                            <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                              {currencyFormatter.format(row.total)}
                            </span>
                          </div>
                          <div
                            style={{
                              height: "12px",
                              borderRadius: "999px",
                              backgroundColor: "#e2e8f0",
                              overflow: "hidden"
                            }}
                          >
                            <div
                              style={{
                                width: `${width}%`,
                                height: "100%",
                                background: "linear-gradient(90deg, #2563eb, #22c55e)",
                                borderRadius: "999px"
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ReportsPage;
