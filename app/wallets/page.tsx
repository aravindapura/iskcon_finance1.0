"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { convertToBase, DEFAULT_SETTINGS } from "@/lib/currency";
import {
  WALLETS,
  type Goal,
  type Operation,
  type Settings,
  type Wallet
} from "@/lib/types";

const WalletsPage = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [operationsResponse, goalsResponse, settingsResponse] = await Promise.all([
          fetch("/api/operations"),
          fetch("/api/goals"),
          fetch("/api/settings")
        ]);

        if (!operationsResponse.ok) {
          throw new Error("Не удалось загрузить операции");
        }

        if (!goalsResponse.ok) {
          throw new Error("Не удалось загрузить цели");
        }

        if (!settingsResponse.ok) {
          throw new Error("Не удалось загрузить настройки");
        }

        const [operationsData, goalsData, settingsData] = await Promise.all([
          operationsResponse.json() as Promise<Operation[]>,
          goalsResponse.json() as Promise<Goal[]>,
          settingsResponse.json() as Promise<Settings>
        ]);

        setOperations(operationsData);
        setGoals(goalsData);
        setSettings(settingsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const goalCategorySet = useMemo(
    () => new Set(goals.map((goal) => goal.title.toLowerCase())),
    [goals]
  );

  const activeSettings = settings ?? DEFAULT_SETTINGS;

  const summaries = useMemo(() => {
    const base: Record<Wallet, number> = WALLETS.reduce((acc, wallet) => {
      acc[wallet] = 0;
      return acc;
    }, {} as Record<Wallet, number>);

    for (const operation of operations) {
      if (
        operation.type === "expense" &&
        goalCategorySet.has(operation.category.toLowerCase())
      ) {
        continue;
      }

      const amountInBase = convertToBase(
        operation.amount,
        operation.currency,
        activeSettings
      );

      base[operation.wallet] += operation.type === "income" ? amountInBase : -amountInBase;
    }

    return WALLETS.map((wallet) => ({
      wallet,
      actualAmount: base[wallet]
    }));
  }, [operations, goalCategorySet, activeSettings]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: activeSettings.baseCurrency
      }),
    [activeSettings.baseCurrency]
  );

  const hasActivity = useMemo(
    () => summaries.some((item) => Math.abs(item.actualAmount) > 0.009),
    [summaries]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ecfeff",
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
          boxShadow: "0 20px 45px rgba(13, 148, 136, 0.15)",
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
            href="/wallets"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: "#99f6e4",
              color: "#047857",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)"
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
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700 }}>Кошельки общины</h1>
          <p style={{ color: "#0f766e", lineHeight: 1.6 }}>
            Следите за фактическими остатками на каждом кошельке с учётом всех приходов и
            расходов.
          </p>
        </header>

        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        {loading ? (
          <p style={{ color: "#64748b" }}>Загружаем данные...</p>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem"
          }}
        >
          {summaries.map(({ wallet, actualAmount }) => (
            <div
              key={wallet}
              style={{
                padding: "1.5rem 1.75rem",
                borderRadius: "1.25rem",
                border: "1px solid #ccfbf1",
                backgroundColor: "#f0fdfa",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                boxShadow: "0 16px 32px rgba(45, 212, 191, 0.12)"
              }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f766e" }}>
                {wallet.charAt(0).toUpperCase() + wallet.slice(1)}
              </h3>
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: actualAmount >= 0 ? "#047857" : "#b91c1c"
                }}
              >
                {currencyFormatter.format(actualAmount)}
              </p>
            </div>
          ))}
        </section>
        {!hasActivity && !loading ? (
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Движений пока не было — добавьте первую операцию, чтобы увидеть остатки по
            кошелькам.
          </p>
        ) : null}
      </main>
    </div>
  );
};

export default WalletsPage;
