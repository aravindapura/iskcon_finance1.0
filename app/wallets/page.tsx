"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent
} from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import { convertFromBase, convertToBase, DEFAULT_SETTINGS } from "@/lib/currency";
import {
  type Currency,
  type Debt,
  type Goal,
  type Operation,
  type Settings,
  type Wallet,
  type WalletWithCurrency
} from "@/lib/types";
import { fetcher, type FetcherError } from "@/lib/fetcher";
import styles from "./transfer-form.module.css";

type WalletsResponse = {
  wallets: WalletWithCurrency[];
};

const inferWalletCurrencyFromName = (wallet: Wallet): Currency | null => {
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

const currencyIcons: Record<string, string> = {
  USD: "🇺🇸",
  RUB: "🇷🇺",
  GEL: "🇬🇪",
  EUR: "🇪🇺"
};

const WalletsContent = () => {
  const { user, refresh } = useSession();
  const defaultAvailable = DEFAULT_SETTINGS.availableCurrencies;
  const initialPrimaryCurrency =
    defaultAvailable[0] ?? DEFAULT_SETTINGS.baseCurrency;
  const initialSecondaryCurrency =
    defaultAvailable[1] ?? initialPrimaryCurrency;
  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletWithCurrency[]>([]);
  const [conversionAmount, setConversionAmount] = useState("1");
  const [convertFromCurrency, setConvertFromCurrency] =
    useState<Currency>(initialPrimaryCurrency);
  const [convertToCurrency, setConvertToCurrency] = useState<Currency>(
    initialSecondaryCurrency
  );
  const [transferAmount, setTransferAmount] = useState("");
  const [transferFromWallet, setTransferFromWallet] = useState<Wallet>("");
  const [transferToWallet, setTransferToWallet] = useState<Wallet>("");
  const [transferFromCurrency, setTransferFromCurrency] = useState<Currency>(
    initialPrimaryCurrency
  );
  const [transferToCurrency, setTransferToCurrency] = useState<Currency>(
    initialSecondaryCurrency
  );
  const [transferComment, setTransferComment] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferFromCurrencyManuallySet, setTransferFromCurrencyManuallySet] =
    useState(false);
  const [transferToCurrencyManuallySet, setTransferToCurrencyManuallySet] = useState(false);
  const [draggingWallet, setDraggingWallet] = useState<Wallet | null>(null);
  const [dragTargetWallet, setDragTargetWallet] = useState<Wallet | null>(null);
  const [transferDialog, setTransferDialog] = useState<{ from: Wallet; to: Wallet } | null>(
    null
  );
  const [dragOriginPosition, setDragOriginPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragPointerPosition, setDragPointerPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragVisualOffset, setDragVisualOffset] = useState<{ x: number; y: number } | null>(null);
  const dragTargetOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragVisualRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragAnimationFrameRef = useRef<number | null>(null);

  const getWalletCurrency = useCallback(
    (walletName: Wallet): Currency | null => {
      if (!walletName) {
        return null;
      }

      const matched = wallets.find(
        (item) => item.name.toLowerCase() === walletName.toLowerCase()
      );

      if (matched) {
        return matched.currency;
      }

      return inferWalletCurrencyFromName(walletName);
    },
    [wallets]
  );

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
    if (!settings) {
      return;
    }

    const list = settings.availableCurrencies;
    const fallback =
      list[0] ?? settings.baseCurrency ?? DEFAULT_SETTINGS.baseCurrency;

    setConvertFromCurrency((current) =>
      list.includes(current) ? current : fallback
    );
    setTransferFromCurrency((current) =>
      list.includes(current) ? current : fallback
    );
  }, [settings]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    const list = settings.availableCurrencies;
    const fallback =
      list.find((code) => code !== convertFromCurrency) ??
      list[0] ??
      settings.baseCurrency ??
      DEFAULT_SETTINGS.baseCurrency;

    setConvertToCurrency((current) =>
      list.includes(current) ? current : fallback
    );
  }, [settings, convertFromCurrency]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    const list = settings.availableCurrencies;
    const fallback =
      list.find((code) => code !== transferFromCurrency) ??
      list[0] ??
      settings.baseCurrency ??
      DEFAULT_SETTINGS.baseCurrency;

    setTransferToCurrency((current) =>
      list.includes(current) ? current : fallback
    );
  }, [settings, transferFromCurrency]);

  useEffect(() => {
    if (transferFromCurrencyManuallySet) {
      return;
    }

    const baseCurrency = (settings ?? DEFAULT_SETTINGS).baseCurrency;
    const inferred = getWalletCurrency(transferFromWallet) ?? baseCurrency;

    setTransferFromCurrency((current) => (current === inferred ? current : inferred));
  }, [transferFromWallet, transferFromCurrencyManuallySet, settings, getWalletCurrency]);

  useEffect(() => {
    if (transferToCurrencyManuallySet) {
      return;
    }

    const baseCurrency = (settings ?? DEFAULT_SETTINGS).baseCurrency;
    const inferred = getWalletCurrency(transferToWallet) ?? baseCurrency;

    setTransferToCurrency((current) => (current === inferred ? current : inferred));
  }, [transferToWallet, transferToCurrencyManuallySet, settings, getWalletCurrency]);

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
        (item) => item.name.toLowerCase() === current.toLowerCase()
      );

      const next = matched ?? walletList[0];
      const inferred = getWalletCurrency(next.name);

      if (inferred && !transferFromCurrencyManuallySet) {
        setTransferFromCurrency(inferred);
      }

      return next.name;
    });

    setTransferToWallet((current) => {
      if (walletList.length === 0) {
        return "";
      }

      const fromCandidate = walletList[0];
      const alternative = walletList.find(
        (item) => item.name.toLowerCase() !== fromCandidate.name.toLowerCase()
      );

      const fallbackTarget = alternative ?? fromCandidate;
      const matched = walletList.find(
        (item) => item.name.toLowerCase() === current.toLowerCase()
      );

      const next = matched ?? fallbackTarget;
      const inferred = getWalletCurrency(next.name);

      if (inferred && !transferToCurrencyManuallySet) {
        setTransferToCurrency(inferred);
      }

      return next.name;
    });
  }, [
    walletsData,
    transferFromCurrencyManuallySet,
    transferToCurrencyManuallySet,
    getWalletCurrency
  ]);

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
      addName(wallet.name);
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
  const availableCurrencies = activeSettings.availableCurrencies;

  const transferBaseAmountOverrides = useMemo(() => {
    const transfers = new Map<string, { income?: Operation; expense?: Operation }>();

    for (const operation of operations) {
      const source = operation.source;

      if (!source || !source.startsWith("transfer:")) {
        continue;
      }

      const transferId = source.slice("transfer:".length);
      const entry =
        transfers.get(transferId) ?? { income: undefined, expense: undefined };

      if (operation.type === "income") {
        entry.income = operation;
      } else {
        entry.expense = operation;
      }

      transfers.set(transferId, entry);
    }

    const overrides = new Map<string, number>();

    transfers.forEach((entry) => {
      const { income, expense } = entry;

      const baseAmount = (() => {
        if (income && income.currency === activeSettings.baseCurrency) {
          return income.amount;
        }

        if (expense && expense.currency === activeSettings.baseCurrency) {
          return expense.amount;
        }

        if (expense) {
          return convertToBase(expense.amount, expense.currency, activeSettings);
        }

        if (income) {
          return convertToBase(income.amount, income.currency, activeSettings);
        }

        return null;
      })();

      if (baseAmount === null) {
        return;
      }

      if (income) {
        overrides.set(income.id, baseAmount);
      }

      if (expense) {
        overrides.set(expense.id, baseAmount);
      }
    });

    return overrides;
  }, [operations, activeSettings]);

  const summaries = useMemo(() => {
    if (walletNames.length === 0) {
      return [] as {
        wallet: string;
        actualAmount: number;
        active: boolean;
        walletCurrencyAmount: { currency: Currency; amount: number } | null;
      }[];
    }

    const activeSet = new Set(wallets.map((item) => item.name.toLowerCase()));
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
      const overrideAmount = transferBaseAmountOverrides.get(operation.id);
      if (
        operation.type === "expense" &&
        goalCategorySet.has(operation.category.toLowerCase())
      ) {
        continue;
      }

      const entry = ensureWalletEntry(operation.wallet);
      const amountInBase =
        overrideAmount ??
        convertToBase(operation.amount, operation.currency, activeSettings);

      if (operation.type === "income") {
        entry.base += amountInBase;
        updateCurrencyAmount(entry.byCurrency, operation.currency, (previous) => previous + operation.amount);
        continue;
      }

      entry.base -= amountInBase;
      updateCurrencyAmount(
        entry.byCurrency,
        operation.currency,
        (previous) => previous - operation.amount
      );
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
  }, [
    walletNames,
    wallets,
    operations,
    debts,
    goalCategorySet,
    activeSettings,
    transferBaseAmountOverrides
  ]);

  const baseCurrencyFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: activeSettings.baseCurrency
      });
    } catch {
      return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "USD"
      });
    }
  }, [activeSettings.baseCurrency]);

  const walletCurrencyFormatters = useMemo(() => {
    const formatters = new Map<Currency, Intl.NumberFormat>();

    for (const currency of availableCurrencies) {
      try {
        formatters.set(
          currency,
          new Intl.NumberFormat("ru-RU", {
            style: "currency",
            currency
          })
        );
      } catch {
        formatters.set(
          currency,
          new Intl.NumberFormat("ru-RU", {
            style: "currency",
            currency: "USD"
          })
        );
      }
    }

    return formatters;
  }, [availableCurrencies]);

  const formatCurrencyValue = useCallback(
    (value: number, currency: Currency) => {
      const formatter = walletCurrencyFormatters.get(currency);

      if (formatter) {
        return formatter.format(value);
      }

      try {
        return new Intl.NumberFormat("ru-RU", {
          style: "currency",
          currency
        }).format(value);
      } catch {
        return new Intl.NumberFormat("ru-RU", {
          style: "currency",
          currency: "USD"
        }).format(value);
      }
    },
    [walletCurrencyFormatters]
  );

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

    return formatCurrencyValue(convertedAmount, convertToCurrency);
  }, [convertedAmount, convertToCurrency, formatCurrencyValue]);

  const conversionRate = useMemo(() => {
    if (!Number.isFinite(conversionAmountNumber)) {
      return null;
    }

    const amountInBase = convertToBase(1, convertFromCurrency, activeSettings);
    const targetAmount = convertFromBase(amountInBase, convertToCurrency, activeSettings);

    return formatCurrencyValue(targetAmount, convertToCurrency);
  }, [
    convertFromCurrency,
    convertToCurrency,
    activeSettings,
    conversionAmountNumber,
    formatCurrencyValue
  ]);

  const formattedSourceAmount = useMemo(() => {
    if (!Number.isFinite(conversionAmountNumber)) {
      return null;
    }

    return formatCurrencyValue(conversionAmountNumber, convertFromCurrency);
  }, [conversionAmountNumber, convertFromCurrency, formatCurrencyValue]);

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

    return formatCurrencyValue(transferAmountNumber, transferFromCurrency);
  }, [transferAmountNumber, transferFromCurrency, formatCurrencyValue]);

  const formattedTransferTargetAmount = useMemo(() => {
    if (transferConvertedAmount === null) {
      return null;
    }

    return formatCurrencyValue(transferConvertedAmount, transferToCurrency);
  }, [transferConvertedAmount, transferToCurrency, formatCurrencyValue]);

  const transferRate = useMemo(() => {
    if (!Number.isFinite(transferAmountNumber)) {
      return null;
    }

    const amountInBase = convertToBase(1, transferFromCurrency, activeSettings);
    const targetAmount = convertFromBase(amountInBase, transferToCurrency, activeSettings);

    return formatCurrencyValue(targetAmount, transferToCurrency);
  }, [
    transferFromCurrency,
    transferToCurrency,
    activeSettings,
    transferAmountNumber,
    formatCurrencyValue
  ]);

  const canSubmitTransfer =
    canManage &&
    Boolean(transferFromWallet) &&
    Boolean(transferToWallet) &&
    transferFromWallet.toLowerCase() !== transferToWallet.toLowerCase() &&
    Number.isFinite(transferAmountNumber) &&
    transferAmountNumber > 0 &&
    transferConvertedAmount !== null;

  useEffect(() => {
    if (!draggingWallet || !dragOriginPosition || !dragPointerPosition) {
      dragTargetOffsetRef.current = { x: 0, y: 0 };
      return;
    }

    dragTargetOffsetRef.current = {
      x: dragPointerPosition.x - dragOriginPosition.x,
      y: dragPointerPosition.y - dragOriginPosition.y
    };
  }, [draggingWallet, dragOriginPosition, dragPointerPosition]);

  useEffect(() => {
    if (!draggingWallet) {
      if (dragAnimationFrameRef.current !== null) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }

      dragVisualRef.current = { x: 0, y: 0 };
      setDragVisualOffset(null);
      return;
    }

    const animate = () => {
      const target = dragTargetOffsetRef.current;
      const current = dragVisualRef.current;
      const next = {
        x: current.x + (target.x - current.x) * 0.22,
        y: current.y + (target.y - current.y) * 0.22
      };

      const distanceToTarget = Math.hypot(target.x - next.x, target.y - next.y);

      if (distanceToTarget < 0.3) {
        dragVisualRef.current = target;
        setDragVisualOffset(target);
      } else {
        dragVisualRef.current = next;
        setDragVisualOffset(next);
      }

      dragAnimationFrameRef.current = requestAnimationFrame(animate);
    };

    dragAnimationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (dragAnimationFrameRef.current !== null) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }
    };
  }, [draggingWallet]);

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
        setTransferDialog(null);

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

  const handleWalletPointerDown = useCallback(
    (wallet: Wallet, origin: { x: number; y: number }, pointer: { x: number; y: number }) => {
      setDraggingWallet(wallet);
      setDragTargetWallet(null);
      setTransferSuccess(null);
      setTransferError(null);
      setDragOriginPosition(origin);
      setDragPointerPosition(pointer);
      const offset = {
        x: pointer.x - origin.x,
        y: pointer.y - origin.y
      };
      dragTargetOffsetRef.current = offset;
      dragVisualRef.current = offset;
      setDragVisualOffset(offset);
    },
    []
  );

  const handleWalletPointerEnter = useCallback(
    (wallet: Wallet) => {
      if (!draggingWallet || draggingWallet === wallet) {
        return;
      }

      setDragTargetWallet(wallet);
    },
    [draggingWallet]
  );

  const handleWalletPointerLeave = useCallback((wallet: Wallet) => {
    setDragTargetWallet((current) => {
      if (current !== wallet) {
        return current;
      }

      return null;
    });
  }, []);

  const finalizeDrag = useCallback(() => {
    if (draggingWallet && dragTargetWallet && dragTargetWallet !== draggingWallet) {
      setTransferFromWallet(draggingWallet);
      setTransferToWallet(dragTargetWallet);
      setTransferDialog({ from: draggingWallet, to: dragTargetWallet });
    }

    setDraggingWallet(null);
    setDragTargetWallet(null);
    setDragOriginPosition(null);
    setDragPointerPosition(null);
    dragTargetOffsetRef.current = { x: 0, y: 0 };
    dragVisualRef.current = { x: 0, y: 0 };
    setDragVisualOffset(null);
  }, [draggingWallet, dragTargetWallet]);

  useEffect(() => {
    if (!draggingWallet) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        event.preventDefault();
      }

      const clientX = event.clientX;
      const clientY = event.clientY;

      setDragPointerPosition({ x: clientX, y: clientY });

      const interactiveWalletElements = Array.from(
        document.querySelectorAll<HTMLElement>("[data-wallet-card][data-wallet-interactive='true']")
      );

      const resolveWalletFromElement = (element: Element | null): Wallet | null => {
        if (!element) {
          return null;
        }

        const walletElement = element.closest<HTMLElement>("[data-wallet-card]");

        if (!walletElement) {
          return null;
        }

        if (walletElement.dataset.walletInteractive !== "true") {
          return null;
        }

        const walletName = walletElement.dataset.walletCard as Wallet | undefined;

        if (!walletName || walletName === draggingWallet) {
          return null;
        }

        return walletName;
      };

      let resolvedWallet = resolveWalletFromElement(document.elementFromPoint(clientX, clientY));

      if (!resolvedWallet) {
        const hoveredElements =
          typeof document.elementsFromPoint === "function"
            ? document.elementsFromPoint(clientX, clientY)
            : [];

        for (const element of hoveredElements) {
          const candidate = resolveWalletFromElement(element);

          if (candidate) {
            resolvedWallet = candidate;
            break;
          }
        }
      }

      if (!resolvedWallet) {
        const containingElement = interactiveWalletElements.find((element) => {
          if (element.dataset.walletCard === draggingWallet) {
            return false;
          }

          const rect = element.getBoundingClientRect();

          return (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          );
        });

        if (containingElement) {
          resolvedWallet = containingElement.dataset.walletCard as Wallet | null;
        }
      }

      const shouldKeepCurrentTarget = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();

        const inside =
          clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

        if (inside) {
          return true;
        }

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.hypot(centerX - clientX, centerY - clientY);
        const keepRadius = Math.max(rect.width, rect.height) * 0.6;

        return distance <= keepRadius;
      };

      setDragTargetWallet((current) => {
        if (resolvedWallet) {
          return current === resolvedWallet ? current : resolvedWallet;
        }

        if (!current) {
          return null;
        }

        const existingElement = interactiveWalletElements.find(
          (element) => element.dataset.walletCard === current
        );

        if (!existingElement) {
          return null;
        }

        return shouldKeepCurrentTarget(existingElement) ? current : null;
      });
    };

    const handlePointerEnd = (event: PointerEvent) => {
      event.preventDefault();
      finalizeDrag();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerEnd, { passive: false });
    window.addEventListener("pointercancel", handlePointerEnd, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [draggingWallet, finalizeDrag]);

  const closeTransferDialog = useCallback(() => {
    setTransferDialog(null);
    setTransferError(null);
  }, []);

  useEffect(() => {
    if (!transferDialog) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTransferDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [transferDialog, closeTransferDialog]);
  if (!user) {
    return null;
  }

  return (
    <PageContainer activeTab="wallets">
      
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}
      >
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>
          Состояние кошельков
        </h1>
      </header>

      {loading ? <p style={{ color: "var(--text-muted)", margin: 0 }}>Загружаем данные...</p> : null}
      {error ? <p style={{ color: "var(--accent-danger)", margin: 0 }}>{error}</p> : null}

      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem"
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Кошельки</h2>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {wallets.length > 0 ? `Всего: ${wallets.length}` : "Пока пусто"}
          </span>
        </div>

        {summaries.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>
            Пока нет активных кошельков — бухгалтер может добавить их в разделе настроек.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
                gap: "0.6rem"
              }}
            >
              {summaries.map((summary) => {
                const isDragSource = draggingWallet === summary.wallet;
                const isDropTarget =
                  dragTargetWallet === summary.wallet && draggingWallet !== summary.wallet;
                const isInteractive = summary.active && wallets.length > 1;
                const iconCurrency =
                  summary.walletCurrencyAmount?.currency ??
                  getWalletCurrency(summary.wallet) ??
                  activeSettings.baseCurrency;
                const cardIcon = currencyIcons[iconCurrency] ?? "💼";
                const baseBorder = summary.active
                  ? "1px solid var(--surface-muted)"
                  : "1px dashed var(--accent-disabled)";
                const cardStyle: CSSProperties = {
                  backgroundColor: summary.active ? "var(--surface-base)" : "var(--surface-muted)",
                  borderRadius: "0.6rem",
                  padding: "0.55rem 0.6rem",
                  border: isDropTarget ? "1px solid var(--accent-teal-strong)" : baseBorder,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "0.25rem",
                  textAlign: "center",
                  cursor: isInteractive ? (isDragSource ? "grabbing" : "grab") : "default",
                  userSelect: "none",
                  touchAction: "none",
                  transition:
                    isDragSource
                      ? "border 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease"
                      : "transform 0.18s ease, border 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease",
                  transform: undefined,
                  boxShadow: undefined,
                  opacity: draggingWallet && !isDragSource && !isDropTarget ? 0.65 : 1
                };

                const dragOffset =
                  isDragSource && dragOriginPosition && dragPointerPosition
                    ? dragVisualOffset ?? {
                        x: dragPointerPosition.x - dragOriginPosition.x,
                        y: dragPointerPosition.y - dragOriginPosition.y
                      }
                    : null;

                const transforms: string[] = [];

                if (isDropTarget) {
                  transforms.push("translateY(-3px) scale(1.04)");
                  cardStyle.boxShadow = "0 0 0 2px rgba(13, 148, 136, 0.2)";
                }

                if (dragOffset) {
                  transforms.push(`translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.05)`);
                  cardStyle.boxShadow = "0 14px 28px rgba(12, 181, 154, 0.3)";
                  cardStyle.transformOrigin = "center";
                  cardStyle.zIndex = 10;
                  cardStyle.opacity = 1;
                  cardStyle.willChange = "transform";
                }

                if (transforms.length > 0) {
                  cardStyle.transform = transforms.join(" ");
                }

                return (
                  <article
                    key={summary.wallet}
                    style={cardStyle}
                    data-wallet-card={summary.wallet}
                    data-wallet-interactive={isInteractive ? "true" : "false"}
                    onPointerDown={(event) => {
                      if (!isInteractive) {
                        return;
                      }

                      if (event.pointerType !== "touch" && event.button !== 0) {
                        return;
                      }

                      event.preventDefault();
                      const element = event.currentTarget as HTMLElement;
                      element.setPointerCapture?.(event.pointerId);
                      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                      handleWalletPointerDown(
                        summary.wallet,
                        {
                          x: rect.left + rect.width / 2,
                          y: rect.top + rect.height / 2
                        },
                        {
                          x: event.clientX,
                          y: event.clientY
                        }
                      );
                    }}
                    onPointerEnter={() => {
                      if (!isInteractive) {
                        return;
                      }

                      handleWalletPointerEnter(summary.wallet);
                    }}
                    onPointerLeave={() => {
                      if (!isInteractive) {
                        return;
                      }

                      handleWalletPointerLeave(summary.wallet);
                    }}
                    onPointerUp={(event) => {
                      if (!isInteractive) {
                        return;
                      }

                      if (event.pointerType !== "touch" && event.button !== 0) {
                        return;
                      }

                      event.preventDefault();
                      (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
                      finalizeDrag();
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "1.75rem",
                        height: "1.75rem",
                        borderRadius: "999px",
                        backgroundColor: "var(--surface-subtle)",
                        fontSize: "0.95rem"
                      }}
                    >
                      {cardIcon}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        lineHeight: 1.2,
                        color: summary.active ? "var(--text-primary)" : "var(--text-secondary)",
                        wordBreak: "break-word"
                      }}
                    >
                      {summary.wallet}
                    </span>
                    <strong
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color:
                          summary.actualAmount >= 0
                            ? "var(--accent-teal-strong)"
                            : "var(--accent-danger)"
                      }}
                    >
                      {baseCurrencyFormatter.format(summary.actualAmount)}
                    </strong>
                    {summary.walletCurrencyAmount ? (
                      <span style={{ fontSize: "0.64rem", color: "var(--text-secondary)" }}>
                        {
                          (
                            walletCurrencyFormatters.get(summary.walletCurrencyAmount.currency) ??
                            new Intl.NumberFormat("ru-RU", {
                              style: "currency",
                              currency: summary.walletCurrencyAmount.currency
                            })
                          ).format(summary.walletCurrencyAmount.amount)
                        }
                      </span>
                    ) : null}
                    {isRussianWallet(summary.wallet) &&
                    summary.walletCurrencyAmount?.currency !== "RUB" ? (
                      <span style={{ fontSize: "0.64rem", color: "var(--text-secondary)" }}>
                        {rubFormatter.format(
                          convertFromBase(summary.actualAmount, "RUB", activeSettings)
                        )}
                      </span>
                    ) : null}
                    {!summary.active ? (
                      <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                        Архивный кошелёк
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
            {hasArchivedWallets ? (
              <p style={{ color: "var(--accent-amber)", fontSize: "0.75rem", margin: 0 }}>
                Архивные кошельки отмечены серым цветом и остаются в отчётах.
              </p>
            ) : null}
          </>
        )}

        {!canManage ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: 0 }}>
            Управление списком доступно бухгалтеру.
          </p>
        ) : null}
      </section>

      {summaries.length > 0 && !hasActivity ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
          Пока нет операций, влияющих на кошельки.
        </p>
      ) : null}

      <section
        style={{
          marginTop: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          backgroundColor: "var(--surface-subtle)",
          borderRadius: "0.75rem",
          padding: "1rem",
          border: "1px solid var(--surface-muted)"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Конвертация</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: 0 }}>
            Пересчёт сумм между валютами по текущим настройкам курса.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            alignItems: "end"
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Сумма</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={conversionAmount}
              onChange={(event) => setConversionAmount(event.target.value)}
              style={{
                padding: "0.5rem 0.65rem",
                borderRadius: "0.65rem",
                border: "1px solid var(--surface-muted)",
                backgroundColor: "var(--surface-base)",
                color: "inherit",
                fontSize: "0.85rem"
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Из валюты</span>
            <select
              value={convertFromCurrency}
              onChange={(event) => setConvertFromCurrency(event.target.value as Currency)}
              style={{
                padding: "0.5rem 0.65rem",
                borderRadius: "0.65rem",
                border: "1px solid var(--surface-muted)",
                backgroundColor: "var(--surface-base)",
                color: "inherit",
                fontSize: "0.85rem"
              }}
            >
              {availableCurrencies.map((currency) => (
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
              alignSelf: "stretch",
              justifySelf: "center",
              padding: "0.55rem 0.6rem",
              borderRadius: "0.65rem",
              border: "1px solid transparent",
              backgroundColor: "var(--accent-teal-strong)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              minWidth: "2.5rem"
            }}
            aria-label="Поменять валюты местами"
          >
            ⇄
          </button>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>В валюту</span>
            <select
              value={convertToCurrency}
              onChange={(event) => setConvertToCurrency(event.target.value as Currency)}
              style={{
                padding: "0.5rem 0.65rem",
                borderRadius: "0.65rem",
                border: "1px solid var(--surface-muted)",
                backgroundColor: "var(--surface-base)",
                color: "inherit",
                fontSize: "0.85rem"
              }}
            >
              {availableCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          {formattedConversionResult && formattedSourceAmount ? (
            <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>
              {formattedSourceAmount} = {formattedConversionResult}
            </p>
          ) : (
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.8rem" }}>
              Введите сумму, чтобы увидеть результат.
            </p>
          )}
          {conversionRate ? (
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.75rem" }}>
              1 {convertFromCurrency} = {conversionRate}
            </p>
          ) : null}
        </div>
      </section>

        {transferDialog ? (
          <div className={styles.transferDialogBackdrop} role="dialog" aria-modal="true">
            <div className={styles.transferDialog}>
              <header className={styles.transferDialogHeader}>
                <div>
                  <h3>Перевод средств</h3>
                  <p>
                    {transferDialog.from} → {transferDialog.to}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeTransferDialog}
                  className={styles.transferDialogClose}
                  aria-label="Закрыть окно перевода"
                >
                  ×
                </button>
              </header>

              <form onSubmit={handleTransferSubmit} className={styles.transferDialogForm}>
                <label className={styles.transferDialogField}>
                  <span>Сумма к списанию</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transferAmount}
                    onChange={(event) => handleTransferAmountChange(event.target.value)}
                  />
                </label>

                <div className={styles.transferDialogRow}>
                  <label className={styles.transferDialogField}>
                    <span>Валюта списания</span>
                    <select
                      value={transferFromCurrency}
                      onChange={(event) =>
                        handleTransferFromCurrencyChange(event.target.value as Currency)
                      }
                    >
                      {availableCurrencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.transferDialogField}>
                    <span>Валюта зачисления</span>
                    <select
                      value={transferToCurrency}
                      onChange={(event) =>
                        handleTransferToCurrencyChange(event.target.value as Currency)
                      }
                    >
                      {availableCurrencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className={styles.transferDialogField}>
                  <span>Комментарий</span>
                  <input
                    type="text"
                    value={transferComment}
                    onChange={(event) => handleTransferCommentChange(event.target.value)}
                    placeholder="Например, перевод между отделами"
                  />
                </label>

                <div className={styles.transferDialogSummary}>
                  <div>
                    <span>Списываем</span>
                    <strong>{formattedTransferSourceAmount ?? "—"}</strong>
                  </div>
                  <div>
                    <span>К зачислению</span>
                    <strong>{formattedTransferTargetAmount ?? "—"}</strong>
                  </div>
                </div>

                {transferRate ? (
                  <p className={styles.transferDialogHint}>
                    1 {transferFromCurrency} ≈ {transferRate}
                  </p>
                ) : null}

                {transferError ? (
                  <p className={styles.transferDialogError}>{transferError}</p>
                ) : null}

                <div className={styles.transferDialogActions}>
                  <button type="button" onClick={closeTransferDialog}>
                    Отмена
                  </button>
                  <button type="submit" disabled={!canSubmitTransfer || transferSubmitting}>
                    {transferSubmitting ? "Переводим..." : "Выполнить перевод"}
                  </button>
                </div>
              </form>
            </div>
          </div>
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
