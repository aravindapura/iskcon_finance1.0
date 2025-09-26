"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import { convertFromBase, convertToBase, DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { buildWalletBalanceMap } from "@/lib/walletsSummary";
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

const inferWalletCurrency = (wallet: Wallet): Currency | null => {
  const normalized = wallet.toLowerCase();

  if (normalized.includes("рус")) {
    return "RUB";
  }

  if (normalized.includes("rub")) {
    return "RUB";
  }

  if (normalized.includes("груз") || normalized.includes("gel")) {
    return "GEL";
  }

  if (normalized.includes("usd") || normalized.includes("дол")) {
    return "USD";
  }

  if (normalized.includes("eur") || normalized.includes("евр")) {
    return "EUR";
  }

  return null;
};

const isRussianWallet = (wallet: Wallet) => /рус/.test(wallet.toLowerCase());

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
  const [transferAmount, setTransferAmount] = useState("");
  const [transferFromWallet, setTransferFromWallet] = useState<Wallet>("");
  const [transferToWallet, setTransferToWallet] = useState<Wallet>("");
  const [transferFromCurrency, setTransferFromCurrency] = useState<Currency>("USD");
  const [transferToCurrency, setTransferToCurrency] = useState<Currency>("GEL");
  const [transferComment, setTransferComment] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferFromCurrencyManuallySet, setTransferFromCurrencyManuallySet] =
    useState(false);
  const [transferToCurrencyManuallySet, setTransferToCurrencyManuallySet] = useState(false);

  const canManage = (user?.role ?? "") === "admin";
  const {
    data: operationsData,
    error: operationsError,
    isLoading: operationsLoading,
    mutate: mutateOperations
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
    if (transferFromCurrencyManuallySet) {
      return;
    }

    const baseCurrency = (settings ?? DEFAULT_SETTINGS).baseCurrency;
    const inferred = inferWalletCurrency(transferFromWallet) ?? baseCurrency;

    setTransferFromCurrency((current) => (current === inferred ? current : inferred));
  }, [transferFromWallet, transferFromCurrencyManuallySet, settings]);

  useEffect(() => {
    if (transferToCurrencyManuallySet) {
      return;
    }

    const baseCurrency = (settings ?? DEFAULT_SETTINGS).baseCurrency;
    const inferred = inferWalletCurrency(transferToWallet) ?? baseCurrency;

    setTransferToCurrency((current) => (current === inferred ? current : inferred));
  }, [transferToWallet, transferToCurrencyManuallySet, settings]);

  useEffect(() => {
    if (!walletsData) {
      return;
    }

    const walletList = Array.isArray(walletsData.wallets) ? walletsData.wallets : [];
    setWallets(walletList);
    setTransferFromWallet((current) => {
      if (walletList.length === 0) {
        return "";
      }

      const matched = walletList.find(
        (item) => item.toLowerCase() === current.toLowerCase()
      );

      const next = matched ?? walletList[0];
      const inferred = inferWalletCurrency(next);

      if (inferred && !transferFromCurrencyManuallySet) {
        setTransferFromCurrency(inferred);
      }

      return next;
    });

    setTransferToWallet((current) => {
      if (walletList.length === 0) {
        return "";
      }

      const fromCandidate = walletList[0];
      const alternative = walletList.find(
        (item) => item.toLowerCase() !== fromCandidate.toLowerCase()
      );

      const fallbackTarget = alternative ?? fromCandidate;
      const matched = walletList.find(
        (item) => item.toLowerCase() === current.toLowerCase()
      );

      const next = matched ?? fallbackTarget;
      const inferred = inferWalletCurrency(next);

      if (inferred && !transferToCurrencyManuallySet) {
        setTransferToCurrency(inferred);
      }

      return next;
    });
  }, [walletsData, transferFromCurrencyManuallySet, transferToCurrencyManuallySet]);

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

  const activeWalletSet = useMemo(
    () => new Set(wallets.map((name) => name.toLowerCase())),
    [wallets]
  );

  const walletBalances = useMemo(
    () =>
      buildWalletBalanceMap({
        walletNames,
        operations,
        debts,
        goals,
        settings: activeSettings
      }),
    [walletNames, operations, debts, goals, activeSettings]
  );

  const summaries = useMemo(() => {
    if (walletNames.length === 0 && walletBalances.size === 0) {
      return [] as {
        wallet: string;
        actualAmount: number;
        active: boolean;
        walletCurrencyAmount: { currency: Currency; amount: number } | null;
      }[];
    }

    const orderedWallets = new Map<string, string>();

    for (const wallet of walletNames) {
      orderedWallets.set(wallet.toLowerCase(), wallet);
    }

    for (const [normalized, entry] of walletBalances.entries()) {
      if (!orderedWallets.has(normalized)) {
        orderedWallets.set(normalized, entry.wallet);
      }
    }

    return Array.from(orderedWallets.values()).map((wallet) => {
      const normalized = wallet.toLowerCase();
      const entry =
        walletBalances.get(normalized) ?? {
          wallet,
          baseAmount: 0,
          byCurrency: {} as Partial<Record<Currency, number>>
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
        wallet: entry.wallet,
        actualAmount: entry.baseAmount,
        active: activeWalletSet.has(normalized),
        walletCurrencyAmount
      };
    });
  }, [walletNames, walletBalances, activeWalletSet]);

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

  const rubFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB"
      }),
    []
  );

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

  const transferAmountNumber = useMemo(() => {
    const normalized = Number.parseFloat(transferAmount.replace(",", "."));

    if (!Number.isFinite(normalized) || normalized <= 0) {
      return NaN;
    }

    return normalized;
  }, [transferAmount]);

  const transferConvertedAmount = useMemo(() => {
    if (!Number.isFinite(transferAmountNumber)) {
      return null;
    }

    const amountInBase = convertToBase(
      transferAmountNumber,
      transferFromCurrency,
      activeSettings
    );

    return convertFromBase(amountInBase, transferToCurrency, activeSettings);
  }, [
    transferAmountNumber,
    transferFromCurrency,
    transferToCurrency,
    activeSettings
  ]);

  const formattedTransferSourceAmount = useMemo(() => {
    if (!Number.isFinite(transferAmountNumber)) {
      return null;
    }

    return (
      walletCurrencyFormatters.get(transferFromCurrency) ??
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: transferFromCurrency
      })
    ).format(transferAmountNumber);
  }, [transferAmountNumber, transferFromCurrency, walletCurrencyFormatters]);

  const formattedTransferTargetAmount = useMemo(() => {
    if (transferConvertedAmount === null) {
      return null;
    }

    return (
      walletCurrencyFormatters.get(transferToCurrency) ??
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: transferToCurrency
      })
    ).format(transferConvertedAmount);
  }, [transferConvertedAmount, transferToCurrency, walletCurrencyFormatters]);

  const transferRate = useMemo(() => {
    if (!Number.isFinite(transferAmountNumber)) {
      return null;
    }

    const amountInBase = convertToBase(1, transferFromCurrency, activeSettings);
    const targetAmount = convertFromBase(amountInBase, transferToCurrency, activeSettings);

    return (
      walletCurrencyFormatters.get(transferToCurrency) ??
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: transferToCurrency
      })
    ).format(targetAmount);
  }, [transferFromCurrency, transferToCurrency, activeSettings, walletCurrencyFormatters, transferAmountNumber]);

  const canSubmitTransfer =
    canManage &&
    Boolean(transferFromWallet) &&
    Boolean(transferToWallet) &&
    transferFromWallet.toLowerCase() !== transferToWallet.toLowerCase() &&
    Number.isFinite(transferAmountNumber) &&
    transferAmountNumber > 0 &&
    transferConvertedAmount !== null;

  const handleTransferSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!canManage) {
        setTransferError("Недостаточно прав для перевода между кошельками");
        return;
      }

      if (!transferFromWallet || !transferToWallet) {
        setTransferError("Выберите исходный и целевой кошельки");
        return;
      }

      if (transferFromWallet.toLowerCase() === transferToWallet.toLowerCase()) {
        setTransferError("Выберите разные кошельки для перевода");
        return;
      }

      if (!Number.isFinite(transferAmountNumber) || transferAmountNumber <= 0) {
        setTransferError("Введите корректную сумму перевода");
        return;
      }

      if (transferConvertedAmount === null) {
        setTransferError("Не удалось рассчитать сумму в целевой валюте");
        return;
      }

      setTransferSubmitting(true);
      setTransferError(null);
      setTransferSuccess(null);

      try {
        const response = await fetch("/api/transfers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fromWallet: transferFromWallet,
            toWallet: transferToWallet,
            amount: transferAmountNumber,
            fromCurrency: transferFromCurrency,
            toCurrency: transferToCurrency,
            comment: transferComment.trim() ? transferComment.trim() : undefined
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;

          setTransferError(payload?.error ?? "Не удалось выполнить перевод");
          return;
        }

        setTransferSuccess("Перевод выполнен успешно");
        setTransferAmount("");
        setTransferComment("");
        setTransferFromCurrencyManuallySet(false);
        setTransferToCurrencyManuallySet(false);

        if (mutateOperations) {
          await mutateOperations();
        }
      } catch (error_) {
        console.error(error_);
        setTransferError("Произошла ошибка при выполнении перевода");
      } finally {
        setTransferSubmitting(false);
      }
    },
    [
      canManage,
      mutateOperations,
      transferAmountNumber,
      transferComment,
      transferConvertedAmount,
      transferFromCurrency,
      transferFromWallet,
      transferToCurrency,
      transferToWallet
    ]
  );

  const handleTransferFromWalletChange = useCallback((value: Wallet) => {
    setTransferFromWallet(value);
    setTransferFromCurrencyManuallySet(false);
    setTransferError(null);
  }, []);

  const handleTransferToWalletChange = useCallback((value: Wallet) => {
    setTransferToWallet(value);
    setTransferToCurrencyManuallySet(false);
    setTransferError(null);
  }, []);

  const handleTransferFromCurrencyChange = useCallback((currency: Currency) => {
    setTransferFromCurrency(currency);
    setTransferFromCurrencyManuallySet(true);
    setTransferError(null);
  }, []);

  const handleTransferToCurrencyChange = useCallback((currency: Currency) => {
    setTransferToCurrency(currency);
    setTransferToCurrencyManuallySet(true);
    setTransferError(null);
  }, []);

  const handleTransferAmountChange = useCallback((value: string) => {
    setTransferAmount(value);
    setTransferError(null);
  }, []);

  const handleTransferCommentChange = useCallback((value: string) => {
    setTransferComment(value);
  }, []);
  if (!user) {
    return null;
  }

  return (
    <PageContainer activeTab="wallets">
      <div className="wallets-wrapper">
        <header className="wallets-header">
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Состояние кошельков</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Анализируйте балансы по каждому кошельку с учётом долгов и целевых средств.
          </p>
        </header>

        {loading ? (
          <p className="wallets-message wallets-message--muted">Загружаем данные...</p>
        ) : null}
        {error ? <p className="wallets-message wallets-message--error">{error}</p> : null}

        <section className="wallets-card">
          <div className="wallets-card__header">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 600 }}>Конвертер валют</h2>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Пересчитайте суммы между валютами по текущим настройкам курса.
            </p>
          </div>

          <div className="wallets-card__fields">
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
              <p className="wallets-message wallets-message--muted">
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

        <section className="wallets-card">
          <div className="wallets-card__header">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 600 }}>Перевод между кошельками</h2>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Перемещайте средства между кошельками и автоматически конвертируйте валюту по
              актуальным настройкам.
            </p>
          </div>

          <form
            onSubmit={handleTransferSubmit}
            className="wallets-card__fields wallets-card__fields--transfer"
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Сумма к списанию
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={transferAmount}
                onChange={(event) => handleTransferAmountChange(event.target.value)}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--surface-muted)",
                  backgroundColor: "var(--surface-base)",
                  color: "inherit",
                  minWidth: "160px"
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Из кошелька
              </span>
              <select
                value={transferFromWallet}
                onChange={(event) => handleTransferFromWalletChange(event.target.value)}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--surface-muted)",
                  backgroundColor: "var(--surface-base)",
                  color: "inherit",
                  minWidth: "180px"
                }}
              >
                <option value="">Выберите кошелёк</option>
                {wallets.map((wallet) => (
                  <option key={wallet} value={wallet}>
                    {wallet}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Валюта списания
              </span>
              <select
                value={transferFromCurrency}
                onChange={(event) =>
                  handleTransferFromCurrencyChange(event.target.value as Currency)
                }
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

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                В кошелёк
              </span>
              <select
                value={transferToWallet}
                onChange={(event) => handleTransferToWalletChange(event.target.value)}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--surface-muted)",
                  backgroundColor: "var(--surface-base)",
                  color: "inherit",
                  minWidth: "180px"
                }}
              >
                <option value="">Выберите кошелёк</option>
                {wallets.map((wallet) => (
                  <option key={wallet} value={wallet}>
                    {wallet}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Валюта зачисления
              </span>
              <select
                value={transferToCurrency}
                onChange={(event) =>
                  handleTransferToCurrencyChange(event.target.value as Currency)
                }
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

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                gridColumn: "1 / -1"
              }}
            >
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Комментарий (по желанию)
              </span>
              <input
                type="text"
                value={transferComment}
                onChange={(event) => handleTransferCommentChange(event.target.value)}
                placeholder="Например, перевод для оплаты счёта"
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--surface-muted)",
                  backgroundColor: "var(--surface-base)",
                  color: "inherit"
                }}
              />
            </label>

            <div className="wallets-transfer-summary">
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                К зачислению
              </span>
              <strong style={{ fontSize: "1.1rem" }}>
                {formattedTransferTargetAmount ?? "—"}
              </strong>
              {transferRate ? (
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  1 {transferFromCurrency} ≈ {transferRate}
                </span>
              ) : null}
              {formattedTransferSourceAmount ? (
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Списываем {formattedTransferSourceAmount}
                </span>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={!canSubmitTransfer || transferSubmitting}
              style={{
                padding: "0.7rem 1.25rem",
                borderRadius: "0.75rem",
                border: "1px solid transparent",
                backgroundColor: canSubmitTransfer
                  ? "var(--accent-teal-strong)"
                  : "var(--surface-muted)",
                color: canSubmitTransfer ? "white" : "var(--text-muted)",
                fontWeight: 600,
                cursor: canSubmitTransfer ? "pointer" : "not-allowed"
              }}
            >
              {transferSubmitting ? "Переводим..." : "Выполнить перевод"}
            </button>
          </form>

          {transferError ? (
            <p className="wallets-message wallets-message--error">{transferError}</p>
          ) : null}

          {transferSuccess ? (
            <p className="wallets-message wallets-message--success">{transferSuccess}</p>
          ) : null}

          {!canManage ? (
            <p className="wallets-message wallets-message--muted">
              Переводы доступны только бухгалтерам.
            </p>
          ) : null}
        </section>

        <section className="wallets-card" style={{ gap: "1.25rem" }}>
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

          <p className="wallets-message wallets-message--muted">
            {wallets.length === 0
              ? "Пока нет активных кошельков — бухгалтер может добавить их в разделе настроек."
              : `Сейчас активных кошельков: ${wallets.length}.`}
          </p>

          {!canManage ? (
            <p className="wallets-message wallets-message--muted">
              Управление списком кошельков доступно бухгалтеру.
            </p>
          ) : null}
        </section>

        <section className="wallets-stat-grid" data-layout="stat-grid">
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
                {isRussianWallet(summary.wallet) &&
                summary.walletCurrencyAmount?.currency !== "RUB" ? (
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                    {rubFormatter.format(
                      convertFromBase(summary.actualAmount, "RUB", activeSettings)
                    )}
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
      </div>
    </PageContainer>
  );
};

const WalletsPage = () => (
  <AuthGate>
    <WalletsContent />
  </AuthGate>
);

export default WalletsPage;
