"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AuthGate from "@/components/AuthGate";
import { useSession } from "@/components/SessionProvider";
import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Currency, Settings } from "@/lib/types";

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

        const data = (await response.json()) as Settings;
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

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | Settings
        | null;

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для изменения курсов");
        return;
      }

      if (!response.ok || !data || "error" in data) {
        throw new Error((data as { error?: string } | null)?.error ?? "Не удалось сохранить настройки");
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ede9fe",
        padding: "3rem 1.5rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start"
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "820px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          padding: "2.5rem 2.75rem",
          boxShadow: "0 20px 45px rgba(109, 40, 217, 0.15)",
          display: "flex",
          flexDirection: "column",
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
              backgroundColor: "#e0e7ff",
              color: "#1d4ed8",
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
              backgroundColor: "#ccfbf1",
              color: "#0f766e",
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
              backgroundColor: "#f5f3ff",
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
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#312e81" }}>
            Финансовые настройки общины
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Обновляйте базовую валюту и курсы конвертации, чтобы отчёты оставались точными.
          </p>
        </header>

        {loading ? <p style={{ color: "#64748b" }}>Загружаем настройки...</p> : null}

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
                backgroundColor: "#eef2ff",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 12px 28px rgba(99, 102, 241, 0.15)"
              }}
            >
              <h2 style={{ color: "#312e81", fontWeight: 600, marginBottom: "0.5rem" }}>
                Базовая валюта
              </h2>
              <strong style={{ fontSize: "1.5rem", color: "#3730a3" }}>{baseCurrency}</strong>
              <p style={{ color: "#475569", marginTop: "0.5rem" }}>
                Все суммы приводятся к этой валюте для расчётов.
              </p>
            </article>
            <article
              style={{
                backgroundColor: "#dcfce7",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 12px 28px rgba(34, 197, 94, 0.12)"
              }}
            >
              <h2 style={{ color: "#166534", fontWeight: 600, marginBottom: "0.5rem" }}>
                Текущий баланс (пример)
              </h2>
              <strong style={{ fontSize: "1.5rem", color: "#15803d" }}>
                {baseFormatter.format(1_000_000)}
              </strong>
              <p style={{ color: "#475569", marginTop: "0.5rem" }}>
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
                <span style={{ fontWeight: 600, color: "#1f2937" }}>
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
                    border: "1px solid #d1d5db"
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
              backgroundColor: saving || !canManage ? "#94a3b8" : "#6d28d9",
              color: "#ffffff",
              fontWeight: 600,
              boxShadow: "0 12px 24px rgba(109, 40, 217, 0.25)",
              cursor: !canManage || saving ? "not-allowed" : "pointer"
            }}
          >
            {saving ? "Сохраняем..." : "Сохранить курсы"}
          </button>
        </form>

        {!canManage ? (
          <p style={{ color: "#64748b" }}>
            Вы вошли как наблюдатель — редактирование курсов недоступно.
          </p>
        ) : null}

        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        {message ? <p style={{ color: "#15803d" }}>{message}</p> : null}
      </main>
    </div>
  );
};

const SettingsPage = () => (
  <AuthGate>
    <SettingsContent />
  </AuthGate>
);

export default SettingsPage;
