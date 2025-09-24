"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import ThemeToggle from "@/components/ThemeToggle";
import { useSession } from "@/components/SessionProvider";
import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Currency, Settings } from "@/lib/types";

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

type RateInfo = {
  rate: number;
  updatedAt: string | null;
};

const RATE_CURRENCIES: readonly Currency[] = ["RUB", "GEL", "EUR"];

const RATE_PLACEHOLDERS: Partial<Record<Currency, string>> = {
  RUB: "0.012",
  GEL: "0.367",
  EUR: "1.18"
};

const buildInitialRates = () =>
  RATE_CURRENCIES.reduce<Partial<Record<Currency, RateInfo>>>((acc, code) => {
    const rawRate = DEFAULT_SETTINGS.rates[code];

    if (typeof rawRate === "number" && Number.isFinite(rawRate) && rawRate > 0) {
      acc[code] = { rate: rawRate, updatedAt: null };
    }

    return acc;
  }, {});

const parseUpdatedAt = (value: unknown): string | null => {
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
};

const normalizeRatesResponse = (rows: unknown[]): Partial<Record<Currency, RateInfo>> => {
  const normalized: Partial<Record<Currency, RateInfo>> = {};

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }

    const { currency, rate, updated_at } = row as {
      currency?: unknown;
      rate?: unknown;
      updated_at?: unknown;
    };

    if (typeof currency !== "string") {
      continue;
    }

    if (!RATE_CURRENCIES.includes(currency as Currency)) {
      continue;
    }

    const numericRate = Number(rate);

    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      continue;
    }

    normalized[currency as Currency] = {
      rate: numericRate,
      updatedAt: parseUpdatedAt(updated_at)
    };
  }

  return normalized;
};

const formatRateValue = (value: number) => {
  const fixed = value.toFixed(6);

  return fixed.replace(/0+$/, "").replace(/\.$/, "");
};

const formatUpdatedAt = (value: string | null) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("ru-RU");
};

const SettingsContent = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "accountant";

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [rates, setRates] = useState<Partial<Record<Currency, RateInfo>>>(
    () => buildInitialRates()
  );
  const [loading, setLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };

    void loadSettings();
  }, [refresh]);

  const loadRates = useCallback(
    async (force = false) => {
      setRatesLoading(true);
      setRatesError(null);
      setMessage(null);

      try {
        const response = await fetch(force ? "/api/rates?force=1" : "/api/rates", {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить курсы");
        }

        const data = await response.json().catch(() => null);

        if (
          !data ||
          typeof data !== "object" ||
          !Array.isArray((data as { rows?: unknown }).rows)
        ) {
          throw new Error("Не удалось загрузить курсы");
        }

        const normalized = normalizeRatesResponse((data as { rows: unknown[] }).rows);

        setRates((prev) => ({
          ...prev,
          ...normalized
        }));

        if (force) {
          setMessage("Курсы успешно обновлены");
        }
      } catch (err) {
        setRatesError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setRatesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const baseCurrency = settings.baseCurrency;
  const baseFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: baseCurrency
      }),
    [baseCurrency]
  );

  const handleForceUpdate = () => {
    if (!canManage) {
      return;
    }

    void loadRates(true);
  };

  return (
    <PageContainer activeTab="settings">
      <header className="page-header">
        <h1 className="page-header__title">Финансовые настройки общины</h1>
        <p className="page-header__description">
          Обновляйте базовую валюту и курсы конвертации, чтобы отчёты оставались точными.
        </p>
      </header>

        <div className="page-actions">
          <ThemeToggle />
        </div>

        {loading ? <p style={{ color: "var(--text-muted)" }}>Загружаем настройки...</p> : null}

        <div className="page-section" style={{ gap: "1.5rem" }}>
          <section data-layout="stat-grid">
            <article
              style={{
                backgroundColor: "var(--surface-indigo)",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 12px 28px rgba(99, 102, 241, 0.15)"
              }}
            >
              <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                Базовая валюта
              </h2>
              <strong style={{ fontSize: "1.5rem", color: "var(--accent-indigo-strong)" }}>{baseCurrency}</strong>
              <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Все суммы приводятся к этой валюте для расчётов.
              </p>
            </article>
            <article
              style={{
                backgroundColor: "var(--surface-success)",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 12px 28px rgba(34, 197, 94, 0.12)"
              }}
            >
              <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
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

          <div data-layout="toolbar">
            {ratesLoading ? (
              <span style={{ color: "var(--text-muted)" }}>Обновляем курсы...</span>
            ) : null}
            <button
              type="button"
              onClick={handleForceUpdate}
              disabled={!canManage || ratesLoading}
              data-variant="primary"
            >
              {ratesLoading ? "Обновляем..." : "Обновить сейчас"}
            </button>
          </div>

          <section data-layout="stat-grid" style={{ gap: "1.25rem" }}>
            {RATE_CURRENCIES.map((code) => {
              const info = rates[code];
              const value = info ? formatRateValue(info.rate) : "";
              const placeholder = RATE_PLACEHOLDERS[code] ?? "1";
              const updatedLabel = formatUpdatedAt(info?.updatedAt ?? null);

              return (
                <label
                  key={code}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
                >
                  <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>
                    USD за 1 {code}
                  </span>
                  <input
                    type="number"
                    value={value}
                    placeholder={placeholder}
                    readOnly
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "0.75rem",
                      border: "1px solid var(--border-muted)"
                    }}
                  />
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    Обновлено: {updatedLabel}
                  </span>
                </label>
              );
            })}
          </section>
        </div>

        <section data-layout="stat-grid" style={{ gap: "1.25rem" }}>
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
              boxShadow: "0 12px 24px rgba(79, 70, 229, 0.15)"
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
              boxShadow: "0 12px 24px rgba(13, 148, 136, 0.15)"
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
            Вы вошли как наблюдатель — обновление курсов недоступно.
          </p>
        ) : null}

        {settingsError ? (
          <p style={{ color: "var(--accent-danger)" }}>{settingsError}</p>
        ) : null}
        {ratesError ? (
          <p style={{ color: "var(--accent-danger)" }}>{ratesError}</p>
        ) : null}
        {message ? <p style={{ color: "var(--accent-success)" }}>{message}</p> : null}
    </PageContainer>
  );
};

const SettingsPage = () => (
  <AuthGate>
    <SettingsContent />
  </AuthGate>
);

export default SettingsPage;
