"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import ThemeToggle from "@/components/ThemeToggle";
import { useSession } from "@/components/SessionProvider";
import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Currency, Settings, StoredExchangeRate } from "@/lib/types";

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

const currencyOrder = new Map(
  SUPPORTED_CURRENCIES.map((code, index) => [code, index] as const)
);

const isStoredExchangeRate = (value: unknown): value is StoredExchangeRate => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StoredExchangeRate>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.baseCurrency === "string" &&
    typeof candidate.targetCurrency === "string" &&
    typeof candidate.rate === "number" &&
    Number.isFinite(candidate.rate) &&
    typeof candidate.date === "string" &&
    SUPPORTED_CURRENCIES.includes(candidate.baseCurrency as Currency) &&
    SUPPORTED_CURRENCIES.includes(candidate.targetCurrency as Currency)
  );
};

const extractRates = (payload: unknown): StoredExchangeRate[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidate = payload as { rates?: unknown };

  if (!Array.isArray(candidate.rates)) {
    return [];
  }

  return candidate.rates.filter(isStoredExchangeRate).map((rate) => ({ ...rate }));
};

const sortRates = (rates: StoredExchangeRate[]) =>
  [...rates].sort((a, b) => {
    const baseDiff =
      (currencyOrder.get(a.baseCurrency) ?? Number.POSITIVE_INFINITY) -
      (currencyOrder.get(b.baseCurrency) ?? Number.POSITIVE_INFINITY);

    if (baseDiff !== 0) {
      return baseDiff;
    }

    return (
      (currencyOrder.get(a.targetCurrency) ?? Number.POSITIVE_INFINITY) -
      (currencyOrder.get(b.targetCurrency) ?? Number.POSITIVE_INFINITY)
    );
  });

const SettingsContent = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [exchangeRates, setExchangeRates] = useState<StoredExchangeRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ratesMessage, setRatesMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setSettingsLoading(true);
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
      } catch (error) {
        setSettingsError(error instanceof Error ? error.message : "Произошла ошибка");
      } finally {
        setSettingsLoading(false);
      }
    };

    void loadSettings();
  }, [refresh]);

  useEffect(() => {
    const loadRates = async () => {
      setRatesLoading(true);
      setRatesError(null);
      setRatesMessage(null);

      try {
        const response = await fetch("/api/exchange-rates", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Не удалось загрузить курсы");
        }

        const data = await response.json().catch(() => null);
        const storedRates = sortRates(extractRates(data));

        if (storedRates.length > 0) {
          setExchangeRates(storedRates);
          return;
        }

        const refreshResponse = await fetch("/api/rates", { cache: "no-store" });
        const refreshData = await refreshResponse.json().catch(() => null);

        if (!refreshResponse.ok) {
          const errorMessage =
            refreshData &&
            typeof refreshData === "object" &&
            "error" in refreshData &&
            typeof (refreshData as { error?: unknown }).error === "string"
              ? (refreshData as { error?: string }).error
              : undefined;

          throw new Error(errorMessage ?? "Не удалось обновить курсы");
        }

        const refreshedRates = sortRates(extractRates(refreshData));

        if (refreshedRates.length === 0) {
          throw new Error("Сервис не вернул данные о курсах");
        }

        setExchangeRates(refreshedRates);
        setRatesMessage("Курсы обновлены автоматически");
      } catch (error) {
        setExchangeRates([]);
        setRatesError(error instanceof Error ? error.message : "Произошла ошибка");
      } finally {
        setRatesLoading(false);
      }
    };

    void loadRates();
  }, []);

  const baseCurrency = settings.baseCurrency;
  const baseFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: baseCurrency,
      }),
    [baseCurrency]
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
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
          Курсы обновляются автоматически раз в день. При необходимости вы можете обновить
          их вручную, просто открыв эту страницу — система запросит актуальные значения.
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

      {settingsLoading ? (
        <p style={{ color: "var(--text-muted)" }}>Загружаем настройки...</p>
      ) : null}

      {settingsError ? (
        <p style={{ color: "var(--accent-danger)" }}>{settingsError}</p>
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

      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-strong)" }}>
          Текущие курсы валют
        </h2>
        {ratesLoading ? (
          <p style={{ color: "var(--text-muted)" }}>Загружаем курсы...</p>
        ) : exchangeRates.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>
            Курсы недоступны. Попробуйте обновить страницу чуть позже.
          </p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              borderRadius: "1rem",
              boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "var(--surface-primary)",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "var(--surface-slate)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.85rem 1rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Базовая валюта
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.85rem 1rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Целевая валюта
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.85rem 1rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Курс
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.85rem 1rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Дата обновления
                  </th>
                </tr>
              </thead>
              <tbody>
                {exchangeRates.map((rate, index) => {
                  const formattedDate = dateFormatter.format(new Date(rate.date));

                  return (
                    <tr
                      key={`${rate.baseCurrency}-${rate.targetCurrency}`}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "var(--surface-primary)" : "var(--surface-muted)",
                      }}
                    >
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>
                        {rate.baseCurrency}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>
                        {rate.targetCurrency}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-strong)" }}>
                        {rate.rate.toFixed(6)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                        {formattedDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

      {ratesMessage ? <p style={{ color: "var(--accent-success)" }}>{ratesMessage}</p> : null}

      {ratesError ? <p style={{ color: "var(--accent-danger)" }}>{ratesError}</p> : null}
    </PageContainer>
  );
};

const SettingsPage = () => (
  <AuthGate>
    <SettingsContent />
  </AuthGate>
);

export default SettingsPage;
