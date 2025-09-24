"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
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

const ReportsContent = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const [operations, setOperations] = useState<Operation[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [operationsResponse, settingsResponse] = await Promise.all([
        fetch("/api/operations"),
        fetch("/api/settings")
      ]);

      if (operationsResponse.status === 401 || settingsResponse.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

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
  }, [refresh]);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

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

  const handleExport = async () => {
    setIsExporting(true);

    let releaseTarget: (() => void) | undefined;
    let cleanupFallbackTimer: number | undefined;

    const performCleanup = () => {
      if (cleanupFallbackTimer) {
        window.clearTimeout(cleanupFallbackTimer);
        cleanupFallbackTimer = undefined;
      }

      if (releaseTarget) {
        releaseTarget();
        releaseTarget = undefined;
      }
    };

    try {
      const createPrintTarget = () => {
        const popup = window.open("", "_blank");

        if (popup) {
          popup.opener = null;

          return {
            target: popup,
            cleanup: () => {
              if (!popup.closed) {
                popup.close();
              }
            },
            isPopup: true
          } as const;
        }

        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.visibility = "hidden";
        iframe.setAttribute("aria-hidden", "true");
        iframe.src = "about:blank";

        document.body.appendChild(iframe);

        const contentWindow = iframe.contentWindow;

        if (!contentWindow) {
          iframe.remove();
          throw new Error("Не удалось создать скрытый фрейм для печати");
        }

        return {
          target: contentWindow,
          cleanup: () => {
            iframe.remove();
          },
          isPopup: false
        } as const;
      };

      const { target: printTarget, cleanup, isPopup } = createPrintTarget();

      releaseTarget = cleanup;

      const handleAfterPrint = () => {
        performCleanup();
      };

      printTarget.addEventListener("afterprint", handleAfterPrint, { once: true });

      if (!isPopup) {
        cleanupFallbackTimer = window.setTimeout(() => {
          performCleanup();
        }, 2000);
      }

      const escapeHtml = (value: string) =>
        value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      const formatDate = (date: Date | null | undefined) =>
        date ? date.toLocaleDateString("ru-RU") : "не указано";

      const formattedStart = formatDate(periodRange.start);
      const formattedEnd = formatDate(periodRange.end);

      const summaryItems = [
        { label: "Приход", value: currencyFormatter.format(totals.income) },
        { label: "Расход", value: currencyFormatter.format(totals.expense) },
        { label: "Баланс", value: currencyFormatter.format(totals.balance) }
      ];

      const categoriesTable =
        categoryRows.length === 0
          ? "<p class=\"empty\">Нет операций за выбранный период.</p>"
          : `<table class=\"data-table\">\n              <thead>\n                <tr>\n                  <th>Категория</th>\n                  <th>Приход</th>\n                  <th>Расход</th>\n                  <th>Итого</th>\n                </tr>\n              </thead>\n              <tbody>\n                ${categoryRows
                  .map(
                    (row) => `
                      <tr>
                        <td>${escapeHtml(row.category)}</td>
                        <td>${escapeHtml(currencyFormatter.format(row.income))}</td>
                        <td>${escapeHtml(currencyFormatter.format(row.expense))}</td>
                        <td>${escapeHtml(currencyFormatter.format(row.total))}</td>
                      </tr>
                    `.trim()
                  )
                  .join("\n")}\n              </tbody>\n            </table>`;

      const documentHtml = `<!DOCTYPE html>
        <html lang=\"ru\">
          <head>
            <meta charSet=\"utf-8\" />
            <title>Финансовый отчёт</title>
            <style>
              :root {
                color-scheme: light;
                font-family: 'Inter', 'Segoe UI', sans-serif;
                --accent: var(--accent-violet);
              }
              body {
                margin: 0;
                padding: 40px 24px;
                background: var(--surface-contrast);
                color: var(--surface-deep);
              }
              .container {
                margin: 0 auto;
                max-width: 720px;
                background: var(--surface-primary);
                padding: 32px 40px;
                border-radius: 16px;
                box-shadow: 0 24px 55px rgba(88, 28, 135, 0.15);
              }
              h1 {
                font-size: 28px;
                margin: 0 0 12px;
                color: var(--accent);
              }
              h2 {
                font-size: 18px;
                margin: 24px 0 12px;
                color: var(--accent-purple-deep);
              }
              p {
                margin: 0 0 8px;
                line-height: 1.6;
              }
              .muted {
                color: var(--text-muted-strong);
              }
              .summary-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
              }
              .summary-list li {
                padding: 12px 16px;
                border-radius: 12px;
                background: var(--surface-violet);
                border: 1px solid rgba(91, 33, 182, 0.12);
              }
              .summary-list strong {
                display: block;
                margin-top: 6px;
                font-size: 16px;
                color: var(--text-strong);
              }
              .data-table {
                width: 100%;
                border-collapse: collapse;
              }
              .data-table thead th {
                text-align: left;
                padding: 12px;
                background: var(--surface-purple);
                color: var(--accent-purple-deep);
                border-bottom: 1px solid var(--surface-blue);
              }
              .data-table tbody td {
                padding: 12px;
                border-bottom: 1px solid var(--border-subtle);
              }
              .data-table tbody tr:last-child td {
                border-bottom: none;
              }
              .empty {
                color: var(--text-muted-strong);
                font-style: italic;
              }
              @media print {
                body {
                  background: var(--surface-primary);
                  padding: 0;
                }
                .container {
                  box-shadow: none;
                  border-radius: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class=\"container\">
              <h1>Финансовый отчёт</h1>
              <p class=\"muted\">Период: ${escapeHtml(`${formattedStart} — ${formattedEnd}`)}</p>
              <p class=\"muted\">Базовая валюта: ${escapeHtml(activeSettings.baseCurrency)}</p>
              <section>
                <h2>Сводка</h2>
                <ul class=\"summary-list\">
                  ${summaryItems
                    .map(
                      (item) => `
                        <li>
                          <span>${item.label}</span>
                          <strong>${escapeHtml(item.value)}</strong>
                        </li>
                      `.trim()
                    )
                    .join("\n")}
                </ul>
              </section>
              <section>
                <h2>Категории</h2>
                ${categoriesTable}
              </section>
            </div>
          </body>
        </html>`;

      const printDocument = printTarget.document;

      printDocument.open();
      printDocument.write(documentHtml);
      printDocument.close();

      await new Promise<void>((resolve) => {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              resolve();
            });
          });
        } else {
          window.setTimeout(() => resolve(), 50);
        }
      });

      printTarget.focus();
      printTarget.print();
    } catch (error) {
      performCleanup();
      console.error(error);
      window.alert("Не удалось подготовить PDF. Попробуйте снова.");
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <PageContainer activeTab="reports">
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}
      >
        <h1 style={{ fontSize: "2.1rem", fontWeight: 700 }}>
          Финансовые отчёты
        </h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Анализируйте поступления и расходы за выбранный период.
        </p>
      </header>

        {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
        {loading ? <p style={{ color: "var(--text-muted)" }}>Загружаем данные...</p> : null}

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
              backgroundColor: "var(--surface-violet)",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 16px 35px rgba(129, 140, 248, 0.25)"
            }}
          >
            <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Приход
            </h2>
            <strong style={{ fontSize: "1.6rem", color: "var(--accent-indigo-strong)" }}>
              {currencyFormatter.format(totals.income)}
            </strong>
          </article>
          <article
            style={{
              backgroundColor: "var(--surface-danger)",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 16px 35px rgba(248, 113, 113, 0.25)"
            }}
          >
            <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Расход
            </h2>
            <strong style={{ fontSize: "1.6rem", color: "var(--accent-danger)" }}>
              {currencyFormatter.format(totals.expense)}
            </strong>
          </article>
          <article
            style={{
              backgroundColor: "var(--surface-success)",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 16px 35px rgba(34, 197, 94, 0.25)"
            }}
          >
            <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Баланс
            </h2>
            <strong style={{ fontSize: "1.6rem", color: totals.balance >= 0 ? "var(--accent-success)" : "var(--accent-danger)" }}>
              {currencyFormatter.format(totals.balance)}
            </strong>
          </article>
        </section>

        <section
          data-layout="responsive-form"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            alignItems: "end"
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span>Период</span>
            <select
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value as PeriodOption)}
              style={{
                padding: "0.85rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid var(--border-muted)"
              }}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {selectedPeriod === "custom" ? (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span>Начало</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border-muted)"
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span>Конец</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border-muted)"
                  }}
                />
              </label>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => void loadOperations()}
            data-variant="primary"
          >
            Обновить данные
          </button>
        </section>

        <section className="reports-section">
          <h2 style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            Категории
          </h2>
          {categoryRows.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Нет операций за выбранный период.</p>
          ) : (
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th scope="col">Категория</th>
                    <th scope="col" className="reports-table__cell--right">
                      Приход
                    </th>
                    <th scope="col" className="reports-table__cell--right">
                      Расход
                    </th>
                    <th scope="col" className="reports-table__cell--right">
                      Итого
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.map((row) => (
                    <tr key={row.category}>
                      <td>{row.category}</td>
                      <td className="reports-table__cell--right reports-table__value--income">
                        {currencyFormatter.format(row.income)}
                      </td>
                      <td className="reports-table__cell--right reports-table__value--expense">
                        {currencyFormatter.format(row.expense)}
                      </td>
                      <td className="reports-table__cell--right reports-table__value--total">
                        {currencyFormatter.format(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          data-variant="primary"
          style={{ alignSelf: "flex-start" }}
        >
          {isExporting ? "Готовим файл..." : "Экспортировать PDF"}
        </button>
    </PageContainer>
  );
};

const ReportsPage = () => (
  <AuthGate>
    <ReportsContent />
  </AuthGate>
);

export default ReportsPage;
