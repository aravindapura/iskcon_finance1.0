"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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

const SettingsPage = () => {
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
      try {
        const response = await fetch("/api/settings");

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
  }, []);

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

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Не удалось сохранить настройки");
      }

      const updated = (await response.json()) as Settings;
      setSettings(updated);
      setRates(buildRatesState(updated));
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

        <header style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700 }}>
            Настройки валют и курсов обмена
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Базовая валюта системы — {baseCurrency}. Все расчёты выполняются с учётом
            указанных ниже курсов.
          </p>
        </header>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Загружаем текущие настройки...</p>
        ) : (
          <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <form
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
              }}
            >
              {SUPPORTED_CURRENCIES.map((code) => {
                const isBase = code === baseCurrency;

                return (
                  <label
                    key={code}
                    style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
                  >
                    <span style={{ fontWeight: 600, color: "#4c1d95" }}>
                      1 {baseCurrency} = {rates[code] ?? ""} {isBase ? baseCurrency : code}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={rates[code] ?? ""}
                      onChange={(event) =>
                        setRates((prev) => ({
                          ...prev,
                          [code]: event.target.value
                        }))
                      }
                      disabled={isBase}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid #d1d5db",
                        backgroundColor: isBase ? "#ede9fe" : "#ffffff",
                        color: isBase ? "#6d28d9" : "#0f172a"
                      }}
                      required={!isBase}
                    />
                    <small style={{ color: "#6b21a8" }}>
                      {isBase
                        ? "Базовая валюта (курс фиксирован)"
                        : `Укажите, сколько ${code} составляет ${baseFormatter.format(1)}.`}
                    </small>
                  </label>
                );
              })}

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "0.95rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  backgroundColor: saving ? "#6d28d9" : "#7c3aed",
                  color: "#ffffff",
                  fontWeight: 600,
                  transition: "background-color 0.2s ease",
                  gridColumn: "1 / -1"
                }}
              >
                {saving ? "Сохраняем..." : "Сохранить курсы"}
              </button>
            </form>
            {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
            {message ? <p style={{ color: "#15803d" }}>{message}</p> : null}
          </section>
        )}
      </main>
    </div>
  );
};

export default SettingsPage;
