"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent
} from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import { convertToBase, DEFAULT_SETTINGS } from "@/lib/currency";
import {
  type Debt,
  type Goal,
  type Operation,
  type Settings,
  type Wallet,
  type WalletWithCurrency
} from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type CategoriesResponse = {
  income: string[];
  expense: string[];
};

type WalletsResponse = {
  wallets: WalletWithCurrency[];
};

const getWalletIcon = (walletName: string) => {
  const normalized = walletName.toLowerCase();

  if (/(карта|card)/.test(normalized)) {
    return "💳";
  }

  if (/(банк|account|сч[её]т|bank)/.test(normalized)) {
    return "🏦";
  }

  if (/(нал|cash)/.test(normalized)) {
    return "💵";
  }

  if (/(crypto|крипт)/.test(normalized)) {
    return "🪙";
  }

  return "👛";
};

const shortenWalletName = (walletName: string) => {
  const trimmed = walletName.trim();

  if (trimmed.length <= 12) {
    return trimmed;
  }

  const segments = trimmed.split(/\s+/);

  if (segments.length > 1) {
    const [first, second] = segments;
    const compact = `${first}${second ? ` ${second.slice(0, 1)}.` : ""}`;

    if (compact.length <= 12) {
      return `${compact}…`;
    }
  }

  return `${trimmed.slice(0, 11)}…`;
};

const Dashboard = () => {
  const { user, refresh } = useSession();
  const canManage = (user?.role ?? "") === "admin";

  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [amount, setAmount] = useState<string>("0");
  const [formType, setFormType] = useState<Operation["type"] | null>(null);
  const [category, setCategory] = useState<string>("Прочее");
  const [comment, setComment] = useState<string>("");
  const [wallets, setWallets] = useState<WalletWithCurrency[]>([]);
  const [wallet, setWallet] = useState<Wallet>("");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseBaseCategories, setExpenseBaseCategories] = useState<string[]>([]);
  const [showBalanceDetails, setShowBalanceDetails] = useState(false);
  const [showCommentField, setShowCommentField] = useState(false);
  const [activeQuickAmount, setActiveQuickAmount] = useState<number | null>(null);
  const [expandedOperationId, setExpandedOperationId] = useState<string | null>(null);
  const [showRecentOperations, setShowRecentOperations] = useState(false);

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
    isLoading: goalsLoading,
    mutate: mutateGoals
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
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading
  } = useSWR<CategoriesResponse>(user ? "/api/categories" : null, fetcher, {
    revalidateOnFocus: true
  });

  const {
    data: walletsData,
    error: walletsError,
    isLoading: walletsLoading,
    mutate: mutateWallets
  } = useSWR<WalletsResponse>(user ? "/api/wallets" : null, fetcher, {
    revalidateOnFocus: true
  });

  const initialLoading =
    operationsLoading ||
    debtsLoading ||
    goalsLoading ||
    settingsLoading ||
    categoriesLoading ||
    walletsLoading;

  const hasDataError = Boolean(
    operationsError ||
      debtsError ||
      goalsError ||
      settingsError ||
      categoriesError ||
      walletsError
  );

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
    if (categoriesData) {
      setIncomeCategories(categoriesData.income);
      setExpenseBaseCategories(categoriesData.expense);
    }
  }, [categoriesData]);

  useEffect(() => {
    if (!walletsData) {
      return;
    }

    const walletList = Array.isArray(walletsData.wallets) ? walletsData.wallets : [];
    setWallets(walletList);
    setWallet((current) => {
      if (walletList.length === 0) {
        return "";
      }

      if (current) {
        const matched = walletList.find(
          (item) => item.name.toLowerCase() === current.toLowerCase()
        );

        if (matched) {
          return matched.name;
        }
      }

      return walletList[0].name;
    });
  }, [walletsData]);

  const selectedWalletInfo = useMemo(
    () =>
      wallets.find(
        (item) => item.name.toLowerCase() === wallet.toLowerCase()
      ) ?? null,
    [wallets, wallet]
  );
  const amountCurrencyLabel =
    selectedWalletInfo?.currency ?? settings?.baseCurrency ?? DEFAULT_SETTINGS.baseCurrency;

  const walletBalanceMap = useMemo(() => {
    const map = new Map<string, { amount: number; currency: Operation["currency"] }>();

    for (const operation of operations) {
      const walletName = operation.wallet?.toLowerCase();

      if (!walletName) {
        continue;
      }

      const previous = map.get(walletName);
      const currentCurrency = previous?.currency ?? operation.currency;
      const currentAmount = previous?.amount ?? 0;
      const delta = operation.type === "income" ? operation.amount : -operation.amount;

      map.set(walletName, {
        currency: currentCurrency,
        amount: currentAmount + delta
      });
    }

    return map;
  }, [operations]);

  const reloadGoals = useCallback(async () => {
    try {
      const data = await mutateGoals();

      if (!data) {
        throw new Error("Ошибка загрузки");
      }

      setGoals(data);
      return data;
    } catch (err) {
      setError("Ошибка загрузки");
      throw err;
    }
  }, [mutateGoals]);

  const incomeOptions = useMemo(() => {
    const normalized = incomeCategories
      .map((item) => item.trim())
      .filter(Boolean);
    const unique = Array.from(new Set(normalized));

    if (!unique.some((item) => item.toLowerCase() === "прочее")) {
      unique.push("Прочее");
    }

    return unique;
  }, [incomeCategories]);

  const expenseOptions = useMemo(() => {
    const normalized = [
      ...expenseBaseCategories,
      ...goals.map((goal) => goal.title)
    ]
      .map((item) => item.trim())
      .filter(Boolean);
    const unique = Array.from(new Set(normalized));

    if (!unique.some((item) => item.toLowerCase() === "прочее")) {
      unique.push("Прочее");
    }

    return unique;
  }, [expenseBaseCategories, goals]);

  const quickAmountOptions = useMemo(() => [10, 50, 100], []);

  const getDefaultCategory = useCallback(
    (operationType: Operation["type"]) => {
      const list = operationType === "income" ? incomeOptions : expenseOptions;
      const fallback = "Прочее";

      if (list.length === 0) {
        return fallback;
      }

      const matched = list.find((item) => item.toLowerCase() === "прочее");
      return matched ?? list[0] ?? fallback;
    },
    [incomeOptions, expenseOptions]
  );

  useEffect(() => {
    if (!formType) {
      return;
    }

    setCategory((current) => {
      if (!current) {
        return getDefaultCategory(formType);
      }

      const list = formType === "income" ? incomeOptions : expenseOptions;
      const matched = list.find(
        (item) => item.toLowerCase() === current.toLowerCase()
      );

      if (matched) {
        return matched;
      }

      return getDefaultCategory(formType);
    });
  }, [formType, getDefaultCategory, incomeOptions, expenseOptions]);

  const handleAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(",", ".");

    if (rawValue === "") {
      setAmount("0");
      setActiveQuickAmount(null);
      return;
    }

    if (rawValue.startsWith("-")) {
      return;
    }

    if (!/^\d*\.?\d*$/.test(rawValue)) {
      return;
    }

    setAmount(rawValue);
    setActiveQuickAmount(null);
  }, []);

  const handleAmountFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    event.target.select();
  }, []);

  const handleQuickAmount = useCallback(
    (increment: number) => {
      if (!canManage || loading) {
        return;
      }

      setActiveQuickAmount(increment);
      setAmount((currentValue) => {
        const numericCurrent = Number.parseFloat(currentValue.replace(",", "."));
        const safeCurrent = Number.isFinite(numericCurrent) ? numericCurrent : 0;
        const result = safeCurrent + increment;

        if (result <= 0) {
          return "0";
        }

        return result
          .toFixed(2)
          .replace(/\.00$/, "")
          .replace(/(\.\d*?)0+$/, "$1");
      });
    },
    [canManage, loading]
  );

  const handleOpenForm = useCallback(
    (operationType: Operation["type"]) => {
      if (!canManage || loading) {
        return;
      }

      setError(null);
      setAmount("0");
      setComment("");
      setShowCommentField(false);
      setActiveQuickAmount(null);

      if (formType === operationType) {
        setFormType(null);
        return;
      }

      setFormType(operationType);
      setCategory(getDefaultCategory(operationType));
    },
    [canManage, loading, formType, getDefaultCategory]
  );

  useEffect(() => {
    if (wallets.length === 0) {
      if (wallet !== "") {
        setWallet("");
      }
      return;
    }

    if (!wallets.some((item) => item.name.toLowerCase() === wallet.toLowerCase())) {
      setWallet(wallets[0]?.name ?? "");
    }
  }, [wallets, wallet]);

  const goalCategorySet = useMemo(
    () => new Set(goals.map((goal) => goal.title.toLowerCase())),
    [goals]
  );

  const debtSummary = useMemo(() => {
    const activeSettings = settings ?? DEFAULT_SETTINGS;

    return debts.reduce(
      (acc, debt) => {
        if (debt.status === "closed") {
          return acc;
        }

        const amountInBase = convertToBase(debt.amount, debt.currency, activeSettings);
        const affectsBalance = debt.existing !== true;

        if (debt.type === "borrowed") {
          return {
            ...acc,
            borrowed: acc.borrowed + amountInBase,
            balanceEffect: affectsBalance
              ? acc.balanceEffect + amountInBase
              : acc.balanceEffect
          };
        }

        return {
          ...acc,
          lent: acc.lent + amountInBase,
          balanceEffect: affectsBalance
            ? acc.balanceEffect + amountInBase
            : acc.balanceEffect
        };
      },
      { borrowed: 0, lent: 0, balanceEffect: 0 }
    );
  }, [debts, settings]);

  const { balanceEffect, borrowed, lent } = debtSummary;

  const balance = useMemo(() => {
    const activeSettings = settings ?? DEFAULT_SETTINGS;

    const operationsBalance = operations.reduce((acc, operation) => {
      const amountInBase = convertToBase(operation.amount, operation.currency, activeSettings);

      if (operation.type === "income") {
        return acc + amountInBase;
      }

      return acc - amountInBase;
    }, 0);

    return operationsBalance + balanceEffect;
  }, [operations, balanceEffect, settings]);

  const netBalance = useMemo(
    () => balance - borrowed + lent,
    [balance, borrowed, lent]
  );

  const activeSettings = settings ?? DEFAULT_SETTINGS;
  const balanceFormatter = useMemo(() => {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!canManage) {
      setError("Недостаточно прав для добавления операции");
      return;
    }

    if (!formType) {
      setError("Выберите тип операции");
      return;
    }

    if (!category) {
      setError(
        formType === "income"
          ? "Выберите источник дохода"
          : "Выберите категорию расхода"
      );
      return;
    }

    if (!wallet) {
      setError("Выберите кошелёк");
      return;
    }

    const numericAmount = Number(amount);
    const selectedType = formType;
    const selectedCategory = category;
    const selectedWallet = wallets.find(
      (item) => item.name.toLowerCase() === wallet.toLowerCase()
    );

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Введите корректную сумму больше нуля");
      return;
    }

    if (!selectedWallet) {
      setError("Некорректный кошелёк");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: selectedType,
          amount: numericAmount,
          currency: selectedWallet.currency,
          category: selectedCategory,
          wallet: selectedWallet.name,
          comment: comment.trim() ? comment.trim() : null,
          source: null
        })
      });

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для добавления операции");
        return;
      }

      if (!response.ok) {
        throw new Error("Не удалось сохранить операцию");
      }

      const operationsData = await mutateOperations();
      if (operationsData) {
        setOperations(operationsData);
      }
      await mutateWallets();
      setAmount("0");
      setComment("");
      setShowCommentField(false);
      setFormType(null);
      setCategory("Прочее");

      if (selectedType === "expense" && goalCategorySet.has(selectedCategory.toLowerCase())) {
        try {
          await reloadGoals();
        } catch {
          // Ошибка уже отображается пользователю через setError
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const toggleOperationDetails = useCallback((id: string) => {
    setExpandedOperationId((prev) => (prev === id ? null : id));
  }, []);

  const handleDelete = async (id: string) => {
    if (!canManage) {
      setError("Недостаточно прав для удаления операции");
      return;
    }

    setError(null);
    setExpandedOperationId((prev) => (prev === id ? null : prev));
    setDeletingId(id);

    try {
      const response = await fetch(`/api/operations/${id}`, {
        method: "DELETE"
      });

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для удаления операции");
        return;
      }

      if (!response.ok) {
        throw new Error("Не удалось удалить операцию");
      }

      const deleted = (await response.json()) as Operation;

      setOperations((prev) => prev.filter((operation) => operation.id !== id));
      void mutateOperations();

      if (deleted.type === "expense" && goalCategorySet.has(deleted.category.toLowerCase())) {
        void reloadGoals().catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeletingId(null);
    }
  };
  if (!user) {
    return null;
  }

  return (
    <PageContainer activeTab="home">
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}
      >
        <h1 style={{ fontSize: "clamp(1.75rem, 5vw, 2.25rem)", fontWeight: 700 }}>
          Бухгалтерия ISCKON Batumi
        </h1>
      </header>

      {initialLoading ? (
        <p style={{ color: "var(--text-muted)" }}>Загрузка...</p>
      ) : hasDataError ? (
        <p style={{ color: "var(--accent-danger)" }}>Ошибка загрузки</p>
      ) : (
        <>
          <section style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem"
              }}
            >
              <h2 style={{ fontSize: "clamp(1.25rem, 4.5vw, 1.5rem)", fontWeight: 600 }}>
                Текущий баланс
              </h2>
              <strong
                style={{
                  fontSize: "clamp(2rem, 5.5vw, 2.75rem)",
                  fontWeight: 700,
                  color: balance >= 0 ? "var(--accent-success)" : "var(--accent-danger)"
                }}
              >
                {balanceFormatter.format(balance)}
              </strong>
            </div>

            <details
              style={{
                background: "rgba(15, 23, 42, 0.55)",
                overflow: "hidden",
                borderRadius: "1.35rem",
                border: "none",
                boxShadow: "0 26px 52px -40px rgba(8, 47, 73, 0.85)",
                backdropFilter: "blur(16px)"
              }}
              open={showBalanceDetails}
              onToggle={(event) => {
                setShowBalanceDetails(event.currentTarget.open);
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  listStyle: "none",
                  padding: "1.05rem 1.35rem",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "0.5rem",
                  color: "rgba(148, 163, 184, 0.75)",
                  letterSpacing: "0.01em"
                }}
                aria-expanded={showBalanceDetails}
              >
                Подробнее
              </summary>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1.1rem 1.35rem",
                  background: "rgba(15, 23, 42, 0.35)",
                  backdropFilter: "blur(18px)",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)"
                }}
              >
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                  Чистый баланс (учитывает долги и активы)
                </h3>
                <strong
                  style={{
                    fontSize: "clamp(1.45rem, 4.5vw, 1.75rem)",
                    color:
                      netBalance >= 0
                        ? "var(--accent-success)"
                        : "var(--accent-danger)"
                  }}
                >
                  {balanceFormatter.format(netBalance)}
                </strong>
              </div>
            </details>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}
            >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "1.25rem",
                flexWrap: "wrap"
              }}
            >
              <button
                type="button"
                onClick={() => handleOpenForm("income")}
                disabled={!canManage || loading}
                style={{
                  position: "relative",
                  padding: "0.55rem 1.4rem",
                  borderRadius: "9999px",
                  border: "none",
                  background:
                    formType === "income"
                      ? "linear-gradient(135deg, rgba(34, 197, 94, 0.85), rgba(16, 185, 129, 0.55))"
                      : "rgba(15, 23, 42, 0.6)",
                  color:
                    formType === "income"
                      ? "#052e16"
                      : "rgba(134, 239, 172, 0.85)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  boxShadow:
                    formType === "income"
                      ? "0 18px 38px -22px rgba(34, 197, 94, 0.75), 0 0 20px rgba(34, 197, 94, 0.45)"
                      : "0 24px 44px -34px rgba(34, 197, 94, 0.55)",
                  cursor: !canManage || loading ? "not-allowed" : "pointer",
                  opacity: !canManage || loading ? 0.55 : 1,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease"
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    width: "1.8rem",
                    height: "1.8rem",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "9999px",
                    background:
                      formType === "income"
                        ? "rgba(134, 239, 172, 0.45)"
                        : "rgba(34, 197, 94, 0.12)",
                    color:
                      formType === "income"
                        ? "#052e16"
                        : "rgba(134, 239, 172, 0.85)",
                    boxShadow:
                      formType === "income"
                        ? "0 0 12px rgba(34, 197, 94, 0.4)"
                        : "none"
                  }}
                >
                  ⬆️
                </span>
                <span>+ Доход</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenForm("expense")}
                disabled={!canManage || loading}
                style={{
                  position: "relative",
                  padding: "0.55rem 1.4rem",
                  borderRadius: "9999px",
                  border: "none",
                  background:
                    formType === "expense"
                      ? "linear-gradient(135deg, rgba(248, 113, 113, 0.9), rgba(239, 68, 68, 0.65))"
                      : "rgba(30, 41, 59, 0.6)",
                  color:
                    formType === "expense"
                      ? "#450a0a"
                      : "rgba(252, 165, 165, 0.85)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  boxShadow:
                    formType === "expense"
                      ? "0 18px 38px -22px rgba(248, 113, 113, 0.85), 0 0 20px rgba(248, 113, 113, 0.45)"
                      : "0 24px 44px -34px rgba(248, 113, 113, 0.6)",
                  cursor: !canManage || loading ? "not-allowed" : "pointer",
                  opacity: !canManage || loading ? 0.55 : 1,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease"
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    width: "1.8rem",
                    height: "1.8rem",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "9999px",
                    background:
                      formType === "expense"
                        ? "rgba(254, 202, 202, 0.45)"
                        : "rgba(239, 68, 68, 0.12)",
                    color:
                      formType === "expense"
                        ? "#450a0a"
                        : "rgba(252, 165, 165, 0.85)",
                    boxShadow:
                      formType === "expense"
                        ? "0 0 12px rgba(239, 68, 68, 0.4)"
                        : "none"
                  }}
                >
                  ⬇️
                </span>
                <span>– Расход</span>
              </button>
            </div>

              {formType ? (
                <form
                  onSubmit={handleSubmit}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.75rem",
                    padding: "2.15rem clamp(1.5rem, 5vw, 2.5rem)",
                    borderRadius: "1.65rem",
                    border: "none",
                    background:
                      "linear-gradient(160deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.72))",
                    boxShadow: "0 42px 80px -48px rgba(8, 47, 73, 0.75)",
                    backdropFilter: "blur(22px)"
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        color: "rgba(226, 232, 240, 0.85)",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        letterSpacing: "0.02em"
                      }}
                    >
                      <span>Сумма</span>
                      <span style={{ color: "var(--accent-primary, #38bdf8)" }}>
                        {amountCurrencyLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        padding: "0.9rem clamp(1rem, 4vw, 1.6rem)",
                        borderRadius: "1.35rem",
                        background: "rgba(148, 163, 184, 0.08)",
                        boxShadow:
                          "0 32px 60px -50px rgba(56, 189, 248, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                        backdropFilter: "blur(16px)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem"
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={handleAmountChange}
                        onFocus={handleAmountFocus}
                        disabled={!canManage || loading}
                        placeholder="0"
                        inputMode="decimal"
                        style={{
                          width: "100%",
                          textAlign: "center",
                          background: "transparent",
                          border: "none",
                          fontSize: "clamp(2.4rem, 9vw, 3.2rem)",
                          fontWeight: 700,
                          letterSpacing: "-0.015em",
                          color: "rgba(226, 232, 240, 0.95)",
                          textShadow: "0 12px 32px rgba(56, 189, 248, 0.2)",
                          outline: "none",
                          boxShadow: "none",
                          caretColor: "transparent",
                          WebkitAppearance: "none"
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "0.65rem",
                        flexWrap: "wrap"
                      }}
                    >
                      {quickAmountOptions.map((value) => {
                        const isActiveChip = activeQuickAmount === value;

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleQuickAmount(value)}
                            disabled={!canManage || loading}
                            style={{
                              padding: "0.55rem 1.05rem",
                              borderRadius: "9999px",
                              border: "none",
                              background: isActiveChip
                                ? "linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(96, 165, 250, 0.72))"
                                : "rgba(148, 163, 184, 0.12)",
                              color: isActiveChip
                                ? "#0b1120"
                                : "rgba(226, 232, 240, 0.85)",
                              fontWeight: 600,
                              fontSize: "0.9rem",
                              boxShadow: isActiveChip
                                ? "0 18px 42px -28px rgba(56, 189, 248, 0.85), 0 0 18px rgba(56, 189, 248, 0.55)"
                                : "0 14px 32px -30px rgba(8, 47, 73, 0.9)",
                              cursor: !canManage || loading ? "not-allowed" : "pointer",
                              opacity: !canManage || loading ? 0.55 : 1,
                              transition:
                                "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease"
                            }}
                          >
                            +{value}
                          </button>
                        );
                      })}
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.1rem"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span style={{ color: "rgba(226, 232, 240, 0.78)", fontSize: "0.95rem", fontWeight: 600 }}>
                        Кошелёк
                      </span>
                      {selectedWalletInfo ? (
                        <span style={{ color: "rgba(148, 163, 184, 0.85)", fontSize: "0.9rem" }}>
                          Валюта: <strong>{selectedWalletInfo.currency}</strong>
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem"
                      }}
                    >
                      {wallets.length === 0 ? (
                        <div
                          style={{
                            padding: "0.95rem 1.1rem",
                            borderRadius: "1rem",
                            background: "rgba(15, 23, 42, 0.6)",
                            color: "rgba(148, 163, 184, 0.85)",
                            fontSize: "0.95rem",
                            textAlign: "center",
                            boxShadow: "0 24px 45px -35px rgba(8, 47, 73, 0.85)"
                          }}
                        >
                          Нет доступных кошельков
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(4.5rem, 1fr))",
                            gap: "0.75rem",
                            justifyItems: "center"
                          }}
                        >
                          {wallets.map((item) => {
                            const normalizedName = item.name.toLowerCase();
                            const isActive = normalizedName === wallet.toLowerCase();
                            const summary = walletBalanceMap.get(normalizedName);
                            const walletAmount = summary?.amount ?? 0;
                            const compactAmount = new Intl.NumberFormat("ru-RU", {
                              notation: "compact",
                              maximumFractionDigits: 1
                            }).format(Math.abs(walletAmount));
                            const formattedAmount = `${walletAmount < 0 ? "-" : ""}${compactAmount}`;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setWallet(item.name)}
                                disabled={!canManage || loading}
                                aria-pressed={isActive}
                                title={item.name}
                                style={{
                                  width: "100%",
                                  aspectRatio: "1 / 1",
                                  padding: "0.5rem 0.45rem",
                                  borderRadius: "1rem",
                                  border: "none",
                                  background: isActive
                                    ? "linear-gradient(155deg, rgba(59, 130, 246, 0.38), rgba(14, 165, 233, 0.32))"
                                    : "rgba(148, 163, 184, 0.08)",
                                  boxShadow: isActive
                                    ? "0 24px 48px -30px rgba(59, 130, 246, 0.85), 0 0 22px rgba(14, 165, 233, 0.55)"
                                    : "0 18px 34px -32px rgba(8, 47, 73, 0.85)",
                                  color: "rgba(226, 232, 240, 0.9)",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "0.3rem",
                                  cursor: !canManage || loading ? "not-allowed" : "pointer",
                                  opacity: !canManage || loading ? 0.55 : 1,
                                  textAlign: "center",
                                  transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
                                  transform: isActive ? "translateY(-2px)" : "translateY(0)",
                                  backdropFilter: "blur(12px)"
                                }}
                              >
                                <span
                                  aria-hidden
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "1.35rem",
                                    height: "1.35rem",
                                    borderRadius: "999px",
                                    background: isActive
                                      ? "rgba(14, 165, 233, 0.25)"
                                      : "rgba(148, 163, 184, 0.12)",
                                    fontSize: "0.85rem",
                                    boxShadow: isActive ? "0 0 12px rgba(14, 165, 233, 0.45)" : "none"
                                  }}
                                >
                                  {getWalletIcon(item.name)}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "0.6rem",
                                    lineHeight: 1.2,
                                    padding: "0 0.1rem",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    width: "100%"
                                  }}
                                >
                                  {shortenWalletName(item.name)}
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.15rem",
                                    width: "100%",
                                    alignItems: "center"
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.55rem",
                                      color: "rgba(148, 163, 184, 0.9)",
                                      fontWeight: 500,
                                      letterSpacing: "0.02em"
                                    }}
                                  >
                                    {item.currency}
                                  </span>
                                  <strong
                                    style={{
                                      fontSize: "0.62rem",
                                      fontWeight: 600,
                                      lineHeight: 1.1,
                                      maxWidth: "100%",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      color:
                                        walletAmount >= 0
                                          ? "var(--accent-success)"
                                          : "var(--accent-danger)"
                                    }}
                                  >
                                    {formattedAmount}
                                  </strong>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem"
                    }}
                  >
                    <span style={{ color: "rgba(226, 232, 240, 0.78)", fontSize: "0.95rem", fontWeight: 600 }}>
                      {formType === "income" ? "Источник дохода" : "Категория"}
                    </span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      disabled={!canManage || loading}
                      style={{
                        width: "100%",
                        padding: "0.85rem 1.1rem",
                        borderRadius: "1rem",
                        border: "none",
                        background: "rgba(15, 23, 42, 0.65)",
                        color: "rgba(226, 232, 240, 0.92)",
                        fontSize: "1.02rem",
                        fontWeight: 600,
                        boxShadow: "0 24px 48px -36px rgba(37, 99, 235, 0.75)",
                        cursor: !canManage || loading ? "not-allowed" : "pointer",
                        opacity: !canManage || loading ? 0.55 : 1,
                        appearance: "none",
                        outline: "none",
                        backdropFilter: "blur(14px)",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease"
                      }}
                    >
                      {(formType === "income" ? incomeOptions : expenseOptions).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  {showCommentField ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem"
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem"
                        }}
                      >
                        <span style={{ color: "rgba(226, 232, 240, 0.78)", fontSize: "0.95rem", fontWeight: 600 }}>
                          Комментарий
                        </span>
                        <textarea
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          rows={3}
                          style={{
                            width: "100%",
                            padding: "0.85rem 1.1rem",
                            borderRadius: "1rem",
                            border: "none",
                            background: "rgba(15, 23, 42, 0.6)",
                            color: "rgba(226, 232, 240, 0.9)",
                            resize: "vertical",
                            boxShadow: "0 28px 52px -40px rgba(8, 47, 73, 0.85)",
                            outline: "none",
                            backdropFilter: "blur(14px)"
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setComment("");
                          setShowCommentField(false);
                        }}
                        style={{
                          alignSelf: "flex-start",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.6rem 1.05rem",
                          borderRadius: "9999px",
                          border: "none",
                          background: "rgba(148, 163, 184, 0.14)",
                          color: "rgba(226, 232, 240, 0.82)",
                          fontWeight: 500,
                          cursor: "pointer",
                          boxShadow: "0 18px 32px -30px rgba(8, 47, 73, 0.9)",
                          transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease"
                        }}
                      >
                        <span aria-hidden>✕</span>
                        <span>Скрыть комментарий</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCommentField(true)}
                      disabled={!canManage || loading}
                      style={{
                        alignSelf: "flex-start",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.6rem 1.05rem",
                        borderRadius: "9999px",
                        border: "none",
                        background: "rgba(148, 163, 184, 0.12)",
                        color: "rgba(226, 232, 240, 0.8)",
                        fontWeight: 500,
                        cursor: !canManage || loading ? "not-allowed" : "pointer",
                        opacity: !canManage || loading ? 0.55 : 1,
                        boxShadow: "0 18px 32px -30px rgba(8, 47, 73, 0.9)",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease"
                      }}
                    >
                      <span aria-hidden>📝</span>
                      <span>Добавить комментарий</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={!canManage || loading}
                    style={{
                      padding: "0.9rem 1.5rem",
                      borderRadius: "0.85rem",
                      border: "none",
                      background: "linear-gradient(135deg, #2563eb, #06b6d4)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "1rem",
                      cursor: !canManage || loading ? "not-allowed" : "pointer",
                      opacity: !canManage || loading ? 0.55 : 1,
                      boxShadow: "0 28px 55px -30px rgba(59, 130, 246, 0.7)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      transform: !canManage || loading ? "translateY(0)" : "translateY(-1px)"
                    }}
                  >
                    {loading ? "Сохраняем..." : "Сохранить"}
                  </button>
                </form>
              ) : null}
            </div>

          {!canManage ? (
            <p style={{ color: "var(--text-muted)" }}>
              Вы вошли как наблюдатель — операции доступны только для просмотра.
            </p>
          ) : null}

          {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
        </section>


        <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontSize: "clamp(1.25rem, 4.5vw, 1.5rem)", fontWeight: 600, margin: 0 }}>
            <button
              type="button"
              onClick={() =>
                setShowRecentOperations((prev) => {
                  const next = !prev;
                  if (!next) {
                    setExpandedOperationId(null);
                  }
                  return next;
                })
              }
              aria-expanded={showRecentOperations}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: 0,
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer"
              }}
            >
              <span>Последние операции</span>
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  transition: "transform 0.2s ease",
                  color: "var(--text-muted)",
                  transform: showRecentOperations ? "rotate(180deg)" : "rotate(0deg)"
                }}
              >
                ⌄
              </span>
            </button>
          </h2>
          {showRecentOperations ? (
            operations.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>
                Пока нет данных — добавьте первую операцию.
              </p>
            ) : (
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  padding: 0,
                  margin: 0,
                  listStyle: "none"
                }}
              >
                {operations.map((operation, index) => {
                  const isExpanded = expandedOperationId === operation.id;
                  const detailsId = `operation-details-${operation.id}`;
                  const isLast = index === operations.length - 1;

                  return (
                    <li
                      key={operation.id}
                      style={{
                        padding: "0.85rem 0",
                        borderBottom: isLast ? "none" : "1px solid rgba(148, 163, 184, 0.18)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleOperationDetails(operation.id)}
                        aria-expanded={isExpanded}
                        aria-controls={detailsId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "1rem",
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          margin: 0,
                          cursor: "pointer",
                          textAlign: "left",
                          color: "inherit"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem"
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {operation.type === "income" ? "Приход" : "Расход"} — {operation.category}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.65rem"
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                operation.type === "income"
                                  ? "var(--accent-success)"
                                  : "var(--accent-danger)",
                              fontSize: "clamp(1rem, 3.5vw, 1.1rem)"
                            }}
                          >
                            {`${operation.type === "income" ? "+" : "-"}${operation.amount.toLocaleString(
                              "ru-RU",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }
                            )} ${operation.currency}`}
                          </span>
                          <span
                            aria-hidden
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1rem",
                              color: "var(--text-muted)",
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease"
                            }}
                          >
                            ⌄
                          </span>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div
                          id={detailsId}
                          style={{
                            display: "flex",
                            justifyContent: canManage ? "space-between" : "flex-start",
                            alignItems: "flex-start",
                            gap: "1.1rem",
                            flexWrap: "wrap"
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.3rem",
                              color: "var(--text-secondary)",
                              fontSize: "0.9rem",
                              lineHeight: 1.5
                            }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              Дата и время: {new Date(operation.date).toLocaleString("ru-RU")}
                            </span>
                            <span>Кошелёк: {operation.wallet || "Не указан"}</span>
                            {operation.comment ? <span>Комментарий: {operation.comment}</span> : null}
                          </div>
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(operation.id)}
                              disabled={deletingId === operation.id}
                              data-variant="danger"
                            >
                              {deletingId === operation.id ? "Удаляем..." : "Удалить"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <p style={{ color: "var(--text-muted)" }}>
              Нажмите на заголовок, чтобы показать последние операции.
            </p>
          )}
          </section>
        </>
      )}
    </PageContainer>
  );
};

const Page = () => (
  <AuthGate>
    <Dashboard />
  </AuthGate>
);

export default Page;
