"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
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

const currencyIcons: Record<Currency, string> = {
  USD: "🇺🇸",
  RUB: "🇷🇺",
  GEL: "🇬🇪",
  EUR: "🇪🇺"
};

const WalletsContent = () => {
  const { user, refresh } = useSession();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletWithCurrency[]>([]);
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

  const draggingWalletCurrency = useMemo(() => {
    if (!draggingWallet) {
      return null;
    }

    return getWalletCurrency(draggingWallet);
  }, [draggingWallet, getWalletCurrency]);

  const dragTargetCurrency = useMemo(() => {
    if (!dragTargetWallet) {
      return null;
    }

    return getWalletCurrency(dragTargetWallet);
  }, [dragTargetWallet, getWalletCurrency]);

  const dragConnectorStyle = useMemo(() => {
    if (!dragOriginPosition || !dragPointerPosition) {
      return null;
    }

    const dx = dragPointerPosition.x - dragOriginPosition.x;
    const dy = dragPointerPosition.y - dragOriginPosition.y;
    const distance = Math.hypot(dx, dy);

    if (!Number.isFinite(distance) || distance < 4) {
      return null;
    }

    return {
      width: `${distance}px`,
      left: `${dragOriginPosition.x}px`,
      top: `${dragOriginPosition.y}px`,
      transform: `translateY(-50%) rotate(${Math.atan2(dy, dx)}rad)`
    } satisfies CSSProperties;
  }, [dragOriginPosition, dragPointerPosition]);

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
  }, [draggingWallet, dragTargetWallet]);

  useEffect(() => {
    if (!draggingWallet) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      setDragPointerPosition({ x: event.clientX, y: event.clientY });
    };

    const handlePointerEnd = (event: PointerEvent) => {
      event.preventDefault();
      finalizeDrag();
    };

    window.addEventListener("pointermove", handlePointerMove);
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
      {draggingWallet && dragPointerPosition ? (
        <div className={styles.dragOverlay}>
          {dragConnectorStyle ? (
            <div className={styles.dragConnector} style={dragConnectorStyle} />
          ) : null}
          <div
            className={styles.dragCard}
            data-targeted={Boolean(dragTargetWallet)}
            style={{
              left: `${dragPointerPosition.x}px`,
              top: `${dragPointerPosition.y}px`
            }}
          >
            <span className={styles.dragLabel}>Перевод</span>
            <div className={styles.dragRoute}>
              <span className={styles.dragWallet}>
                <span className={styles.dragWalletIcon}>
                  {draggingWalletCurrency ? currencyIcons[draggingWalletCurrency] : "💼"}
                </span>
                {draggingWallet}
              </span>
              <span className={styles.dragArrow}>→</span>
              <span className={styles.dragWallet}>
                <span className={styles.dragWalletIcon}>
                  {dragTargetCurrency ? currencyIcons[dragTargetCurrency] : "🎯"}
                </span>
                {dragTargetWallet ?? "Выберите кошелёк"}
              </span>
            </div>
            <p className={styles.dragHint}>
              {dragTargetWallet
                ? "Отпустите, чтобы открыть перевод"
                : "Наведите на кошелёк, чтобы выбрать получателя"}
            </p>
          </div>
        </div>
      ) : null}
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

        <section className={styles.transferSection}>
          <div className={styles.transferHeader}>
            <h2 className={styles.transferTitle}>Перевод между кошельками</h2>
            <p className={styles.transferDescription}>
              Перемещайте средства между кошельками и автоматически конвертируйте валюту по
              актуальным настройкам.
            </p>
          </div>

          <form onSubmit={handleTransferSubmit} className={styles.transferForm}>
            <label className={styles.transferField}>
              <span className={styles.transferLabel}>Сумма к списанию</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={transferAmount}
                onChange={(event) => handleTransferAmountChange(event.target.value)}
                className={styles.transferInput}
              />
            </label>

            <label className={styles.transferField}>
              <span className={styles.transferLabel}>Из кошелька</span>
              <div className={styles.currencyControl}>
                <span className={styles.currencyIcon}>💼</span>
                <select
                  value={transferFromWallet}
                  onChange={(event) => handleTransferFromWalletChange(event.target.value)}
                  className={styles.transferSelect}
                >
                  <option value="">Выберите кошелёк</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.name}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className={styles.transferField}>
              <span className={styles.transferLabel}>Валюта списания</span>
              <div className={styles.currencyControl}>
                <span className={styles.currencyIcon}>
                  {currencyIcons[transferFromCurrency] ?? "💱"}
                </span>
                <select
                  value={transferFromCurrency}
                  onChange={(event) =>
                    handleTransferFromCurrencyChange(event.target.value as Currency)
                  }
                  className={styles.transferSelect}
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className={styles.transferField}>
              <span className={styles.transferLabel}>В кошелёк</span>
              <div className={styles.currencyControl}>
                <span className={styles.currencyIcon}>📥</span>
                <select
                  value={transferToWallet}
                  onChange={(event) => handleTransferToWalletChange(event.target.value)}
                  className={styles.transferSelect}
                >
                  <option value="">Выберите кошелёк</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.name}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className={styles.transferField}>
              <span className={styles.transferLabel}>Валюта зачисления</span>
              <div className={styles.currencyControl}>
                <span className={styles.currencyIcon}>
                  {currencyIcons[transferToCurrency] ?? "💱"}
                </span>
                <select
                  value={transferToCurrency}
                  onChange={(event) =>
                    handleTransferToCurrencyChange(event.target.value as Currency)
                  }
                  className={styles.transferSelect}
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className={`${styles.transferField} ${styles.transferFieldWide}`}>
              <span className={styles.transferLabel}>Комментарий (по желанию)</span>
              <input
                type="text"
                value={transferComment}
                onChange={(event) => handleTransferCommentChange(event.target.value)}
                placeholder="Например, перевод для оплаты счёта"
                className={styles.transferInput}
              />
            </label>

            <div className={styles.transferSummary}>
              <span className={styles.transferSummaryTitle}>К зачислению</span>
              <strong className={styles.transferSummaryValue}>
                {formattedTransferTargetAmount ?? "—"}
              </strong>
              {transferRate ? (
                <span className={styles.transferSummaryHint}>
                  1 {transferFromCurrency} ≈ {transferRate}
                </span>
              ) : null}
              {formattedTransferSourceAmount ? (
                <span className={styles.transferSummaryHint}>
                  Списываем {formattedTransferSourceAmount}
                </span>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={!canSubmitTransfer || transferSubmitting}
              className={styles.transferButton}
            >
              {transferSubmitting ? "Переводим..." : "Выполнить перевод"}
            </button>
          </form>

          {transferError ? (
            <p style={{ color: "var(--accent-danger)", margin: 0 }}>{transferError}</p>
          ) : null}

          {transferSuccess ? (
            <p style={{ color: "var(--accent-teal-strong)", margin: 0 }}>{transferSuccess}</p>
          ) : null}

          {!canManage ? (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              Переводы доступны только бухгалтерам.
            </p>
          ) : null}
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
            summaries.map((summary) => {
              const isDragSource = draggingWallet === summary.wallet;
              const isDropTarget =
                dragTargetWallet === summary.wallet && draggingWallet !== summary.wallet;
              const isInteractive = summary.active && wallets.length > 1;
              const baseBorder = summary.active
                ? "1px solid transparent"
                : "1px dashed var(--accent-disabled)";
              const cardStyle: CSSProperties = {
                backgroundColor: summary.active ? "var(--surface-subtle)" : "var(--surface-muted)",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: summary.active
                  ? "0 12px 24px rgba(13, 148, 136, 0.12)"
                  : "0 8px 18px rgba(100, 116, 139, 0.12)",
                border: isDropTarget ? "1px solid var(--accent-teal-strong)" : baseBorder,
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                cursor: isInteractive ? (isDragSource ? "grabbing" : "grab") : "default",
                userSelect: "none",
                touchAction: "none",
                transition: "transform 0.15s ease, border 0.15s ease, box-shadow 0.15s ease",
                transform: isDropTarget ? "translateY(-4px) scale(1.01)" : undefined,
                opacity: draggingWallet && !isDragSource && !isDropTarget ? 0.85 : 1
              };

              return (
                <article
                  key={summary.wallet}
                  style={cardStyle}
                  onPointerDown={(event) => {
                    if (!isInteractive) {
                      return;
                    }

                    if (event.pointerType !== "touch" && event.button !== 0) {
                      return;
                    }

                    event.preventDefault();
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
                    finalizeDrag();
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <h2 style={{ fontWeight: 600 }}>{summary.wallet}</h2>
                    {!summary.active ? (
                      <span style={{ color: "var(--accent-amber)", fontSize: "0.85rem" }}>
                        Кошелёк удалён — операции и остатки сохранены
                      </span>
                    ) : null}
                    {isInteractive && isDropTarget ? (
                      <span style={{ color: "var(--accent-teal-strong)", fontSize: "0.85rem" }}>
                        Отпустите, чтобы перевести в этот кошелёк
                      </span>
                    ) : null}
                    {isInteractive && isDragSource ? (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        Перетащите на другой кошелёк для перевода
                      </span>
                    ) : null}
                  </div>
                  <strong
                    style={{
                      fontSize: "1.5rem",
                      color:
                        summary.actualAmount >= 0 ? "var(--accent-teal-strong)" : "var(--accent-danger)"
                    }}
                  >
                    {baseCurrencyFormatter.format(summary.actualAmount)}
                  </strong>
                  {summary.walletCurrencyAmount ? (
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
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
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                      {rubFormatter.format(
                        convertFromBase(summary.actualAmount, "RUB", activeSettings)
                      )}
                    </span>
                  ) : null}
                </article>
              );
            })
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
                      {SUPPORTED_CURRENCIES.map((currency) => (
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
                      {SUPPORTED_CURRENCIES.map((currency) => (
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
