"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useSession } from "@/components/SessionProvider";
import { convertToBase, DEFAULT_SETTINGS } from "@/lib/currency";
import { type Debt, type Goal, type Operation, type Settings, type Wallet } from "@/lib/types";

type WalletsResponse = {
  wallets: Wallet[];
};

const WalletsContent = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const canManage = user.role === "accountant";

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          operationsResponse,
          debtsResponse,
          goalsResponse,
          settingsResponse,
          walletsResponse
        ] = await Promise.all([
          fetch("/api/operations"),
          fetch("/api/debts"),
          fetch("/api/goals"),
          fetch("/api/settings"),
          fetch("/api/wallets")
        ]);

        if (
          operationsResponse.status === 401 ||
          debtsResponse.status === 401 ||
          goalsResponse.status === 401 ||
          settingsResponse.status === 401 ||
          walletsResponse.status === 401
        ) {
          setError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (!operationsResponse.ok) {
          throw new Error("Не удалось загрузить операции");
        }

        if (!debtsResponse.ok) {
          throw new Error("Не удалось загрузить данные по долгам");
        }

        if (!goalsResponse.ok) {
          throw new Error("Не удалось загрузить цели");
        }

        if (!settingsResponse.ok) {
          throw new Error("Не удалось загрузить настройки");
        }

        if (!walletsResponse.ok) {
          throw new Error("Не удалось загрузить список кошельков");
        }

        const [operationsData, debtsData, goalsData, settingsData, walletsData] =
          await Promise.all([
            operationsResponse.json() as Promise<Operation[]>,
            debtsResponse.json() as Promise<Debt[]>,
            goalsResponse.json() as Promise<Goal[]>,
            settingsResponse.json() as Promise<Settings>,
            walletsResponse.json() as Promise<WalletsResponse>
          ]);

        setOperations(operationsData);
        setDebts(debtsData);
        setGoals(goalsData);
        setSettings(settingsData);
        setWallets(Array.isArray(walletsData.wallets) ? walletsData.wallets : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [refresh]);

  const goalCategorySet = useMemo(
    () => new Set(goals.map((goal) => goal.title.toLowerCase())),
    [goals]
  );

  const walletNames = useMemo(() => {
    const unique = new Map<string, string>();

    const addName = (value: string) => {
      if (!value) {
        return;
      }

      const normalized = value.toLowerCase();

      if (!unique.has(normalized)) {
        unique.set(normalized, value);
      }
    };

    for (const wallet of wallets) {
      addName(wallet);
    }

    for (const operation of operations) {
      addName(operation.wallet);
    }

    for (const debt of debts) {
      addName(debt.wallet);
    }

    return Array.from(unique.values());
  }, [wallets, operations, debts]);

  const activeSettings = settings ?? DEFAULT_SETTINGS;

  const summaries = useMemo(() => {
    if (walletNames.length === 0) {
      return [] as { wallet: string; actualAmount: number; active: boolean }[];
    }

    const activeSet = new Set(wallets.map((name) => name.toLowerCase()));
    const base = walletNames.reduce((acc, wallet) => {
      acc[wallet] = 0;
      return acc;
    }, {} as Record<string, number>);

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

    for (const debt of debts) {
      if (debt.status === "closed") {
        continue;
      }

      const amountInBase = convertToBase(debt.amount, debt.currency, activeSettings);

      base[debt.wallet] += debt.type === "borrowed" ? amountInBase : -amountInBase;
    }

    return walletNames.map((wallet) => ({
      wallet,
      actualAmount: base[wallet] ?? 0,
      active: activeSet.has(wallet.toLowerCase())
    }));
  }, [walletNames, wallets, operations, debts, goalCategorySet, activeSettings]);

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

  const hasArchivedWallets = useMemo(
    () => summaries.some((item) => !item.active),
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
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a" }}>
            Состояние кошельков
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Анализируйте балансы по каждому кошельку с учётом долгов и целевых средств.
          </p>
        </header>

        {loading ? <p style={{ color: "#64748b" }}>Загружаем данные...</p> : null}
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

        <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap"
            }}
          >
            <h2 style={{ fontSize: "1.4rem", fontWeight: 600, color: "#0f172a" }}>
              Активные кошельки
            </h2>
          </div>

          <p style={{ color: "#475569", margin: 0 }}>
            Просматривайте активные кошельки и их остатки. Добавление и удаление доступно в
            отдельном разделе.
          </p>

          <p style={{ color: "#64748b", margin: 0 }}>
            {wallets.length === 0
              ? "Пока нет активных кошельков — бухгалтер может добавить их в разделе настроек."
              : `Сейчас активных кошельков: ${wallets.length}.`}
          </p>

          {!canManage ? (
            <p style={{ color: "#64748b" }}>
              Управление списком кошельков доступно бухгалтеру.
            </p>
          ) : null}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem"
          }}
        >
          {summaries.length === 0 ? (
            <p style={{ color: "#64748b", gridColumn: "1 / -1" }}>
              Пока нет кошельков или связанных операций.
            </p>
          ) : (
            summaries.map((summary) => (
              <article
                key={summary.wallet}
                style={{
                  backgroundColor: summary.active ? "#f8fafc" : "#f1f5f9",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  boxShadow: summary.active
                    ? "0 12px 24px rgba(13, 148, 136, 0.12)"
                    : "0 8px 18px rgba(100, 116, 139, 0.12)",
                  border: summary.active ? "1px solid transparent" : "1px dashed #94a3b8",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <h2 style={{ color: "#0f172a", fontWeight: 600 }}>{summary.wallet}</h2>
                  {!summary.active ? (
                    <span style={{ color: "#b45309", fontSize: "0.85rem" }}>
                      Кошелёк удалён — операции и остатки сохранены
                    </span>
                  ) : null}
                </div>
                <strong
                  style={{
                    fontSize: "1.5rem",
                    color: summary.actualAmount >= 0 ? "#047857" : "#b91c1c"
                  }}
                >
                  {currencyFormatter.format(summary.actualAmount)}
                </strong>
              </article>
            ))
          )}
        </section>

        {summaries.length > 0 && hasArchivedWallets ? (
          <p style={{ color: "#b45309" }}>
            Удалённые кошельки помечены отдельно — связанные операции и балансы остаются в
            отчётах.
          </p>
        ) : null}

        {!hasActivity ? (
          <p style={{ color: "#64748b" }}>
            Пока нет операций, влияющих на кошельки.
          </p>
        ) : null}
      </main>
    </div>
  );
};

const WalletsPage = () => (
  <AuthGate>
    <WalletsContent />
  </AuthGate>
);

export default WalletsPage;
