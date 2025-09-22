"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import ThemeToggle from "@/components/ThemeToggle";
import { useSession } from "@/components/SessionProvider";
import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Currency, Settings } from "@/lib/types";

type RateRow = {
  baseCurrency: Currency;
  targetCurrency: Currency;
  rate: number;
  date: string;
};

const isSettings = (value: unknown): value is Settings => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Settings>;

  return (
    typeof candidate.baseCurrency === "string" &&
    SUPPORTED_CURRENCIES.includes(candidate.baseCurrency as Currency) &&
    !!candidate.rates &&
    typeof candidate.rates === "object"
  );
};

const isRateRow = (value: unknown): value is RateRow => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<RateRow>;

  return (
    typeof row.baseCurrency === "string" &&
    SUPPORTED_CURRENCIES.includes(row.baseCurrency as Currency) &&
    typeof row.targetCurrency === "string" &&
    SUPPORTED_CURRENCIES.includes(row.targetCurrency as Currency) &&
    typeof row.rate === "number" &&
    Number.isFinite(row.rate) &&
    typeof row.date === "string"
  );
};

const isRatesResponse = (value: unknown): value is {
  rows: RateRow[];
  skipped?: boolean;
  count?: number;
  reason?: string;
} => {
  if (!value || typeof value !== "object" || !("rows" in value)) {
    return false;
  }

  const rows = (value as { rows?: unknown }).rows;

  return Array.isArray(rows) && rows.every(isRateRow);
};

const SettingsContent = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "accountant";

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [rates, setRates] = useState<RateRow[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [forceUpdating, setForceUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoadingSettings(true);
      setSettingsError(null);

      try {
        const response = await fetch("/api/settings");

        if (response.status === 401) {
          setSettingsError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (!response.ok) {
          throw new Error("Не удалось загрузить настройки");
        }

        const data = await response.json().catch(() => null);

        if (!isSettings(data)) {
          throw new Error("Не удалось загрузить настройки");
        }

        setSettings(data);
      } catch (err) {
        setSettingsError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setLoadingSettings(false);
      }
    };

    void loadSettings();
  }, [refresh]);

  const loadRates = useCallback(
    async (force = false) => {
      if (force && !canManage) {
        return;
      }

      if (force) {
        setForceUpdating(true);
        setMessage(null);
      } else {
        setRatesLoading(true);
      }

      setRatesError(null);

      try {
        const response = await fetch(force ? "/api/rates?force=1" : "/api/rates", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !isRatesResponse(data)) {
          const reason =
            data &&
            typeof data === "object" &&
            "reason" in data &&
            typeof (data as { reason?: unknown }).reason === "string"
              ? (data as { reason: string }).reason
              : undefined;

          throw new Error(reason ?? "Не удалось загрузить курсы");
        }

        setRates(data.rows);

        if (force) {
          setMessage(
            data.skipped
              ? "Курсы уже были актуальны за последние 24 часа."
              : `Обновлено ${data.count ?? data.rows.length} курсов.`
          );
        }
      } catch (err) {
        setRatesError(
          err instanceof Error ? err.message : "Не удалось загрузить курсы"
        );
      } finally {
        if (force) {
          setForceUpdating(false);
        } else {
          setRatesLoading(false);
        }
      }
    },
    [canManage]
  );

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const baseCurrency = settings.baseCurrency;
  const baseFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: baseCurrency,
      }),
    [baseCurrency]
  );

  return (
    <PageContainer activeTab="settings">
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--surface-navy)" }}>
          Финансовые настройки общины
        </h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Обновляйте базовую валюту и курсы конвертации, чтобы отчёты оставались точными.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <ThemeToggle />
      </div>

      {loadingSettings ? (
        <p style={{ color: "var(--text-muted)" }}>Загружаем настройки...</p>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <article
          style={{
            backgroundColor: "var(--surface-indigo)",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 12px 28px rgba(99, 102, 241, 0.15)",
          }}
        >
          <h2 style={{ color: "var(--surface-navy)", fontWeight: 600, marginBottom: "0.5rem" }}>
            Базовая валюта
          </h2>
          <strong style={{ fontSize: "1.5rem", color: "var(--accent-indigo-strong)" }}>
            {baseCurrency}
          </strong>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            Все суммы приводятся к этой валюте для расчётов.
          </p>
        </article>
        <article
          style={{
            backgroundColor: "var(--surface-success)",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 12px 28px rgba(34, 197, 94, 0.12)",
          }}
        >
          <h2 style={{ color: "var(--accent-success-strong)", fontWeight: 600, marginBottom: "0.5rem" }}>
            Текущий баланс (пример)
          </h2>
          <strong style={{ fontSize: "1.5rem", color: "var(--accent-success)" }}>
            {baseFormatter.format(1_000_000)}
          </strong>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            Для проверки отображения формата валюты.
          </p>
        </article>
      </section>

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Курсы валют (авто)</h2>
          <button
            type="button"
            onClick={() => void loadRates(true)}
            disabled={!canManage || forceUpdating}
            className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {forceUpdating ? "Обновляем..." : "Обновить сейчас"}
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Обновляется ежедневно по расписанию. Можно принудительно обновить кнопкой.
        </p>
        {message ? (
          <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
        ) : null}
        {ratesError ? (
          <p className="mb-4 text-sm text-rose-600 dark:text-rose-400">{ratesError}</p>
        ) : null}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          {ratesLoading ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Загружаем курсы...
            </p>
          ) : rates.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Курсы ещё не загружены. Нажмите «Обновить сейчас».
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left">Базовая</th>
                  <th className="px-4 py-2 text-left">Целевая</th>
                  <th className="px-4 py-2 text-left">Курс</th>
                  <th className="px-4 py-2 text-left">Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr
                    key={`${rate.baseCurrency}-${rate.targetCurrency}`}
                    className="border-t border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-2">{rate.baseCurrency}</td>
                    <td className="px-4 py-2">{rate.targetCurrency}</td>
                    <td className="px-4 py-2">{rate.rate.toFixed(6)}</td>
                    <td className="px-4 py-2">{new Date(rate.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
        }}
      >
        <Link
          href="/settings/categories"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "1.5rem",
            borderRadius: "1rem",
            backgroundColor: "var(--surface-indigo)",
            textDecoration: "none",
            boxShadow: "0 12px 24px rgba(79, 70, 229, 0.15)",
          }}
        >
          <strong style={{ color: "var(--accent-indigo-strong)", fontSize: "1.1rem" }}>
            Категории
          </strong>
          <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Добавляйте и удаляйте категории прихода и расхода в отдельном разделе.
          </span>
        </Link>

        <Link
          href="/settings/wallets"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "1.5rem",
            borderRadius: "1rem",
            backgroundColor: "var(--surface-cyan)",
            textDecoration: "none",
            boxShadow: "0 12px 24px rgba(13, 148, 136, 0.15)",
          }}
        >
          <strong style={{ color: "var(--accent-teal)", fontSize: "1.1rem" }}>
            Кошельки
          </strong>
          <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Управляйте списком кошельков, не затрагивая связанные операции.
          </span>
        </Link>
      </section>

      {!canManage ? (
        <p style={{ color: "var(--text-muted)" }}>
          Вы вошли как наблюдатель — принудительное обновление недоступно.
        </p>
      ) : null}

      {settingsError ? (
        <p style={{ color: "var(--accent-danger)" }}>{settingsError}</p>
      ) : null}
    </PageContainer>
  );
};

const SettingsPage = () => (
  <AuthGate>
    <SettingsContent />
  </AuthGate>
);

export default SettingsPage;
