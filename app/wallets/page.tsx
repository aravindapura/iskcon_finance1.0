"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import { convertFromBase, convertToBase, DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { extractDebtPaymentAmount } from "@/lib/debtPayments";
import {
  type Currency,
  type Debt,
  type Goal,
  type Operation,
  type Settings,
  type Wallet
} from "@/lib/types";
import { fetcher, type FetcherError } from "@/lib/fetcher";

type WalletsResponse = {
  wallets: Wallet[];
};

const WalletsContent = () => {
  const { user, refresh } = useSession();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [conversionAmount, setConversionAmount] = useState("1");
  const [convertFromCurrency, setConvertFromCurrency] = useState<Currency>("USD");
  const [convertToCurrency, setConvertToCurrency] = useState<Currency>("GEL");

  const canManage = (user?.role ?? "") === "admin";
  const {
    data: operationsData,
    error: operationsError,
    isLoading: operationsLoading
  } = useSWR<Operation[]>(user ? "/api/operations" : null, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000
  });

  const {
    data: debtsData,
    error: debtsError,
    isLoading: debtsLoading
  } = useSWR<Debt[]>(user ? "/api/debts" : null, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000
  });

  const {
    data: goalsData,
    error: goalsError,
    isLoading: goalsLoading
  } = useSWR<Goal[]>(user ? "/api/goals" : null, fetcher, {
    revalidateOnFocus: true
  });

  const {
    data: settingsData,
    error: settingsError,
    isLoading: settingsLoading
  } = useSWR<Settings>(user ? "/api/settings" : null, fetcher, {
    revalidateOnFocus: true
  });

  const {
    data: walletsData,
    error: walletsError,
    isLoading: walletsLoading
  } = useSWR<WalletsResponse>(user ? "/api/wallets" : null, fetcher, {
    revalidateOnFocus: true
  });

  const loading =
    operationsLoading ||
    debtsLoading ||
    goalsLoading ||
    settingsLoading ||
    walletsLoading;

  useEffect(() => {
    if (operationsData) {
      setOperations(operationsData);
    }
  }, [operationsData]);

  useEffect(() => {
    if (debtsData) {
      setDebts(debtsData);
    }
  }, [debtsData]);

  useEffect(() => {
    if (goalsData) {
      setGoals(goalsData);
    }
  }, [goalsData]);

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  useEffect(() => {
    if (!walletsData) {
      return;
    }

    const walletList = Array.isArray(walletsData.wallets) ? walletsData.wallets : [];
    setWallets(walletList);
  }, [walletsData]);

  useEffect(() => {
    const currentError =
      operationsError ||
      debtsError ||
      goalsError ||
      settingsError ||
      walletsError;

    if (!currentError) {
      setError(null);
      return;
    }

    if ((currentError as FetcherError).status === 401) {
      setError("Сессия истекла, войдите заново.");
      void refresh();
      return;
    }

    setError("Не удалось загрузить данные");
  }, [operationsError, debtsError, goalsError, settingsError, walletsError, refresh]);

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
      return [] as {
        wallet: string;
        actualAmount: number;
        active: boolean;
        walletCurrencyAmount: { currency: Currency; amount: number } | null;
      }[];
    }

    const activeSet = new Set(wallets.map((name) => name.toLowerCase()));
    const base = walletNames.reduce((acc, wallet) => {
      acc[wallet] = {
        base: 0,
        byCurrency: {} as Partial<Record<Currency, number>>
      };
      return acc;
    }, {} as Record<string, { base: number; byCurrency: Partial<Record<Currency, number>> }>);

    const ensureWalletEntry = (wallet: string) => {
      if (!base[wallet]) {
        base[wallet] = {
          base: 0,
          byCurrency: {}
        };
      }

      return base[wallet];
    };

    const updateCurrencyAmount = (
      map: Partial<Record<Currency, number>>,
      currency: Currency,
      updater: (previous: number) => number
    ) => {
      map[currency] = updater(map[currency] ?? 0);
    };

    for (const operation of operations) {
      if (
        operation.type === "expense" &&
        goalCategorySet.has(operation.category.toLowerCase())
      ) {
        continue;
      }

      const entry = ensureWalletEntry(operation.wallet);
      const amountInBase = convertToBase(
        operation.amount,
        operation.currency,
        activeSettings
      );

      if (operation.type === "income") {
        entry.base += amountInBase;
        updateCurrencyAmount(entry.byCurrency, operation.currency, (previous) => previous + operation.amount);
        continue;
      }

      entry.base -= amountInBase;
      updateCurrencyAmount(entry.byCurrency, operation.currency, (previous) => previous - operation.amount);

      const debtPaymentAmount = extractDebtPaymentAmount(operation.source);

      if (debtPaymentAmount > 0) {
        const paymentInBase = convertToBase(
          debtPaymentAmount,
          operation.currency,
          activeSettings
        );
        entry.base += paymentInBase;
        updateCurrencyAmount(entry.byCurrency, operation.currency, (previous) => previous + debtPaymentAmount);
      }
    }

    for (const debt of debts) {
      if (debt.status === "closed") {
        continue;
      }

      if (debt.existing === true) {
        continue;
      }

      const entry = ensureWalletEntry(debt.wallet);
      const amountInBase = convertToBase(debt.amount, debt.currency, activeSettings);

      if (debt.type === "borrowed") {
        entry.base += amountInBase;
        updateCurrencyAmount(entry.byCurrency, debt.currency, (previous) => previous + debt.amount);
        continue;
      }

      entry.base -= amountInBase;
      updateCurrencyAmount(entry.byCurrency, debt.currency, (previous) => previous - debt.amount);
    }

    return walletNames.map((wallet) => {
      const entry = base[wallet] ?? {
        base: 0,
        byCurrency: {}
      };

      const currencyEntries = Object.entries(entry.byCurrency).filter(([, amount]) =>
        Math.abs(amount ?? 0) > 0.009
      ) as [Currency, number][];

      currencyEntries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

      const walletCurrencyAmount =
        currencyEntries.length > 0
          ? { currency: currencyEntries[0][0], amount: currencyEntries[0][1] }
          : null;

      return {
        wallet,
        actualAmount: entry.base,
        active: activeSet.has(wallet.toLowerCase()),
        walletCurrencyAmount
      };
    });
  }, [walletNames, wallets, operations, debts, goalCategorySet, activeSettings]);

  const baseCurrencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: activeSettings.baseCurrency
      }),
    [activeSettings.baseCurrency]
  );

  const walletCurrencyFormatters = useMemo(() => {
    const formatters = new Map<Currency, Intl.NumberFormat>();

    for (const currency of SUPPORTED_CURRENCIES) {
      formatters.set(
        currency,
        new Intl.NumberFormat("ru-RU", {
          style: "currency",
          currency
        })
      );
    }

    return formatters;
  }, []);

  const hasActivity = useMemo(
    () => summaries.some((item) => Math.abs(item.actualAmount) > 0.009),
    [summaries]
  );

  const hasArchivedWallets = useMemo(
    () => summaries.some((item) => !item.active),
    [summaries]
  );

  const conversionAmountNumber = useMemo(() => {
    const normalized = Number.parseFloat(conversionAmount.replace(",", "."));

    if (!Number.isFinite(normalized) || normalized < 0) {
      return NaN;
    }

    return normalized;
  }, [conversionAmount]);

  const convertedAmount = useMemo(() => {
    if (!Number.isFinite(conversionAmountNumber)) {
      return null;
    }

    const amountInBase = convertToBase(
      conversionAmountNumber,
      convertFromCurrency,
      activeSettings
    );

    return convertFromBase(amountInBase, convertToCurrency, activeSettings);
  }, [
    conversionAmountNumber,
    convertFromCurrency,
    convertToCurrency,
    activeSettings
  ]);

  const formattedConversionResult = useMemo(() => {
    if (convertedAmount === null) {
      return null;
    }

    return (
      walletCurrencyFormatters.get(convertToCurrency) ??
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: convertToCurrency
      })
    ).format(convertedAmount);
  }, [convertedAmount, convertToCurrency, walletCurrencyFormatters]);

  const conversionRate = useMemo(() => {
    if (!Number.isFinite(conversionAmountNumber)) {
      return null;
    }

    const amountInBase = convertToBase(1, convertFromCurrency, activeSettings);
    const targetAmount = convertFromBase(amountInBase, convertToCurrency, activeSettings);

    return (
      walletCurrencyFormatters.get(convertToCurrency) ??
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: convertToCurrency
      })
    ).format(targetAmount);
  }, [convertFromCurrency, convertToCurrency, activeSettings, walletCurrencyFormatters, conversionAmountNumber]);

  const formattedSourceAmount = useMemo(() => {
    if (!Number.isFinite(conversionAmountNumber)) {
      return null;
    }

    return (
      walletCurrencyFormatters.get(convertFromCurrency) ??
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: convertFromCurrency
      })
    ).format(conversionAmountNumber);
  }, [conversionAmountNumber, convertFromCurrency, walletCurrencyFormatters]);
  if (!user) {
    return null;
  }

  return (
    <PageContainer activeTab="wallets">
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
          Состояние кошельков
        </h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Анализируйте балансы по каждому кошельку с учётом долгов и целевых средств.
        </p>
      </header>

        {loading ? <p style={{ color: "var(--text-muted)" }}>Загружаем данные...</p> : null}
        {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            backgroundColor: "var(--surface-subtle)",
            borderRadius: "1rem",
            padding: "1.5rem"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 600 }}>Конвертер валют</h2>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Пересчитайте суммы между валютами по текущим настройкам курса.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "flex-end"
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Сумма</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={conversionAmount}
                onChange={(event) => setConversionAmount(event.target.value)}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--surface-muted)",
                  backgroundColor: "var(--surface-base)",
                  color: "inherit",
                  minWidth: "140px"
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Из валюты</span>
              <select
                value={convertFromCurrency}
                onChange={(event) => setConvertFromCurrency(event.target.value as Currency)}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--surface-muted)",
                  backgroundColor: "var(--surface-base)",
                  color: "inherit",
                  minWidth: "140px"
                }}
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setConvertFromCurrency(convertToCurrency);
                setConvertToCurrency(convertFromCurrency);
              }}
              style={{
                padding: "0.65rem 0.9rem",
                borderRadius: "0.75rem",
                border: "1px solid transparent",
                backgroundColor: "var(--accent-teal-strong)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              ⇄
            </button>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>В валюту</span>
              <select
                value={convertToCurrency}
                onChange={(event) => setConvertToCurrency(event.target.value as Currency)}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--surface-muted)",
                  backgroundColor: "var(--surface-base)",
                  color: "inherit",
                  minWidth: "140px"
                }}
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {formattedConversionResult && formattedSourceAmount ? (
              <p style={{ margin: 0, fontWeight: 600 }}>
                {formattedSourceAmount} = {formattedConversionResult}
              </p>
            ) : (
              <p style={{ margin: 0, color: "var(--text-muted)" }}>
                Введите корректную сумму для конвертации.
              </p>
            )}
            {conversionRate ? (
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                1 {convertFromCurrency} = {conversionRate}
              </p>
            ) : null}
          </div>
        </section>

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
            <h2 style={{ fontSize: "1.4rem", fontWeight: 600 }}>
              Активные кошельки
            </h2>
          </div>

          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            Просматривайте активные кошельки и их остатки. Добавление и удаление доступно в
            отдельном разделе.
          </p>

          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            {wallets.length === 0
              ? "Пока нет активных кошельков — бухгалтер может добавить их в разделе настроек."
              : `Сейчас активных кошельков: ${wallets.length}.`}
          </p>

          {!canManage ? (
            <p style={{ color: "var(--text-muted)" }}>
              Управление списком кошельков доступно бухгалтеру.
            </p>
          ) : null}
        </section>

        <section
          data-layout="stat-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem"
          }}
        >
          {summaries.length === 0 ? (
            <p style={{ color: "var(--text-muted)", gridColumn: "1 / -1" }}>
              Пока нет кошельков или связанных операций.
            </p>
          ) : (
            summaries.map((summary) => (
              <article
                key={summary.wallet}
                style={{
                  backgroundColor: summary.active ? "var(--surface-subtle)" : "var(--surface-muted)",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  boxShadow: summary.active
                    ? "0 12px 24px rgba(13, 148, 136, 0.12)"
                    : "0 8px 18px rgba(100, 116, 139, 0.12)",
                  border: summary.active ? "1px solid transparent" : "1px dashed var(--accent-disabled)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <h2 style={{ fontWeight: 600 }}>{summary.wallet}</h2>
                  {!summary.active ? (
                    <span style={{ color: "var(--accent-amber)", fontSize: "0.85rem" }}>
                      Кошелёк удалён — операции и остатки сохранены
                    </span>
                  ) : null}
                </div>
                <strong
                  style={{
                    fontSize: "1.5rem",
                    color: summary.actualAmount >= 0 ? "var(--accent-teal-strong)" : "var(--accent-danger)"
                  }}
                >
                  {baseCurrencyFormatter.format(summary.actualAmount)}
                </strong>
                {summary.walletCurrencyAmount ? (
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                    {(
                      walletCurrencyFormatters.get(summary.walletCurrencyAmount.currency) ??
                      new Intl.NumberFormat("ru-RU", {
                        style: "currency",
                        currency: summary.walletCurrencyAmount.currency
                      })
                    ).format(summary.walletCurrencyAmount.amount)}
                  </span>
                ) : null}
              </article>
            ))
          )}
        </section>

        {summaries.length > 0 && hasArchivedWallets ? (
          <p style={{ color: "var(--accent-amber)" }}>
            Удалённые кошельки помечены отдельно — связанные операции и балансы остаются в
            отчётах.
          </p>
        ) : null}

        {!hasActivity ? (
          <p style={{ color: "var(--text-muted)" }}>
            Пока нет операций, влияющих на кошельки.
          </p>
        ) : null}
    </PageContainer>
  );
};

const WalletsPage = () => (
  <AuthGate>
    <WalletsContent />
  </AuthGate>
);

export default WalletsPage;
