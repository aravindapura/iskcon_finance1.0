"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AuthGate from "@/components/AuthGate";
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

const buildRatesState = (settings: Settings) =>
  SUPPORTED_CURRENCIES.reduce<Record<Currency, string>>((acc, code) => {
    if (code === settings.baseCurrency) {
      acc[code] = "1";
      return acc;
    }

    const rawRate = settings.rates[code];
    const normalized =
      typeof rawRate === "number" && Number.isFinite(rawRate) && rawRate > 0
        ? 1 / rawRate
        : 1;

    acc[code] = Number(normalized.toFixed(6)).toString();
    return acc;
  }, {} as Record<Currency, string>);

const SettingsContent = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "accountant";

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [rates, setRates] = useState<Record<Currency, string>>(() =>
    buildRatesState(DEFAULT_SETTINGS)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);

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

        const data = await response.json().catch(() => null);

        if (!isSettings(data)) {
          throw new Error("Не удалось загрузить настройки");
        }

        setSettings(data);
        setRates(buildRatesState(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [refresh]);

  const baseCurrency = settings.baseCurrency;
  const baseFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: baseCurrency
      }),
    [baseCurrency]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!canManage) {
      setError("Недостаточно прав для изменения курсов");
      return;
    }

    setSaving(true);

    const payloadRates: Partial<Record<Currency, number>> = {};

    for (const currency of SUPPORTED_CURRENCIES) {
      if (currency === baseCurrency) {
        continue;
      }

      const value = rates[currency];
      const numeric = Number(value);

      if (!Number.isFinite(numeric) || numeric <= 0) {
        setError(
          `Введите положительный курс (количество ${currency} за 1 ${baseCurrency})`
        );
        setSaving(false);
        return;
      }

      payloadRates[currency] = 1 / numeric;
    }

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rates: payloadRates })
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для изменения курсов");
        return;
      }

      if (
        !response.ok ||
        !isSettings(data)
      ) {
        const errorMessage =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error?: string }).error
            : undefined;

        throw new Error(errorMessage ?? "Не удалось сохранить настройки");
      }

      setSettings(data);
      setRates(buildRatesState(data));
      setMessage("Курсы успешно обновлены");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className="page-shell bg-white text-black dark:bg-midnight dark:text-slate-100"
      style={{
        maxWidth: "820px",
        width: "100%",
        padding: "2.5rem 2.75rem",
        gap: "2.25rem"
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
              backgroundColor: "var(--surface-blue)",
              color: "var(--accent-blue)",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)"
            }}
          >
            Главная
          </Link>
          <Link
            href="/wallets"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: "var(--surface-teal)",
              color: "var(--accent-teal)",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(45, 212, 191, 0.25)"
            }}
          >
            Кошельки
          </Link>
          <Link
            href="/debts"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: "var(--surface-indigo)",
              color: "var(--accent-indigo)",
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
              backgroundColor: "var(--surface-success)",
              color: "var(--accent-success)",
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
              backgroundColor: "var(--surface-amber)",
              color: "var(--accent-amber)",
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
              backgroundColor: "var(--surface-purple)",
              color: "var(--accent-purple)",
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
            flexDirection: "column",
            gap: "0.75rem"
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
            justifyContent: "flex-end"
          }}
        >
          <ThemeToggle />
        </div>

        {loading ? <p style={{ color: "var(--text-muted)" }}>Загружаем настройки...</p> : null}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}
        >
          <section
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
                boxShadow: "0 12px 28px rgba(99, 102, 241, 0.15)"
              }}
            >
              <h2 style={{ color: "var(--surface-navy)", fontWeight: 600, marginBottom: "0.5rem" }}>
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
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem"
            }}
          >
            {SUPPORTED_CURRENCIES.filter((code) => code !== baseCurrency).map((code) => (
              <label
                key={code}
                style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>
                  {code} за 1 {baseCurrency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={rates[code] ?? "1"}
                  onChange={(event) =>
                    setRates((prev) => ({
                      ...prev,
                      [code]: event.target.value
                    }))
                  }
                  disabled={!canManage || saving}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border-muted)"
                  }}
                />
              </label>
            ))}
          </section>

          <button
            type="submit"
            disabled={!canManage || saving}
            style={{
              padding: "0.95rem 1.5rem",
              borderRadius: "0.85rem",
              border: "none",
              backgroundColor: saving || !canManage ? "var(--accent-disabled)" : "var(--accent-purple)",
              color: "var(--surface-primary)",
              fontWeight: 600,
              boxShadow: "0 12px 24px rgba(109, 40, 217, 0.25)",
              cursor: !canManage || saving ? "not-allowed" : "pointer"
            }}
          >
            {saving ? "Сохраняем..." : "Сохранить курсы"}
          </button>
        </form>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem"
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
            Вы вошли как наблюдатель — редактирование курсов недоступно.
          </p>
        ) : null}

        {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
        {message ? <p style={{ color: "var(--accent-success)" }}>{message}</p> : null}
    </main>
  );
};

const SettingsPage = () => (
  <AuthGate>
    <SettingsContent />
  </AuthGate>
);

export default SettingsPage;
