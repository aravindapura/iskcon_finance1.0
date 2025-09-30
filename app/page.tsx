"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import {
  convertToBase,
  DEFAULT_SETTINGS,
  SUPPORTED_CURRENCIES
} from "@/lib/currency";
import {
  type Currency,
  type Debt,
  type Goal,
  type Operation,
  type Settings,
  type Wallet,
  type WalletWithCurrency
} from "@/lib/types";
import { extractDebtPaymentAmount } from "@/lib/debtPayments";

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

const Dashboard = () => {
  const { user, refresh } = useSession();
  const canManage = (user?.role ?? "") === "admin";

  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<Operation["type"]>("income");
  const [category, setCategory] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>(DEFAULT_SETTINGS.baseCurrency);
  const [wallets, setWallets] = useState<WalletWithCurrency[]>([]);
  const [wallet, setWallet] = useState<Wallet>("");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseBaseCategories, setExpenseBaseCategories] = useState<string[]>([]);
  const [showBalanceDetails, setShowBalanceDetails] = useState(false);

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
    isLoading: walletsLoading
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
      setCurrency(settingsData.baseCurrency);
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

  const expenseOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...expenseBaseCategories,
          ...goals.map((goal) => goal.title)
        ])
      ),
    [expenseBaseCategories, goals]
  );

  const categorySuggestions = useMemo(() => {
    const baseCategories = type === "income" ? incomeCategories : expenseOptions;
    const relevantOperations = operations.filter((operation) => operation.type === type);
    const seen = new Set<string>();
    const addUnique = (list: string[], acc: string[]) => {
      list.forEach((item) => {
        const normalized = item.trim();
        if (!normalized) {
          return;
        }

        const key = normalized.toLowerCase();
        if (seen.has(key)) {
          return;
        }

        seen.add(key);
        acc.push(normalized);
      });

      return acc;
    };

    const recentCategories = relevantOperations.map((operation) => operation.category);
    const combined = addUnique(recentCategories, []);
    addUnique(baseCategories, combined);

    return combined.slice(0, 10);
  }, [type, incomeCategories, expenseOptions, operations]);

  useEffect(() => {
    if (categorySuggestions.length === 0) {
      setCategory("");
      return;
    }

    setCategory((current) => {
      if (current) {
        const matched = categorySuggestions.find(
          (item) => item.toLowerCase() === current.toLowerCase()
        );

        if (matched) {
          return matched;
        }
      }

      return categorySuggestions[0];
    });
  }, [categorySuggestions]);

  const handleAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(",", ".");

    if (rawValue === "") {
      setAmount("");
      return;
    }

    if (rawValue.startsWith("-")) {
      return;
    }

    if (!/^\d*\.?\d*$/.test(rawValue)) {
      return;
    }

    setAmount(rawValue);
  }, []);

  const handleQuickAmount = useCallback((increment: number) => {
    setAmount((current) => {
      const normalizedCurrent = current.replace(",", ".");
      const currentValue = Number.parseFloat(normalizedCurrent);
      const baseValue = Number.isFinite(currentValue) ? currentValue : 0;
      const nextValue = Math.max(0, baseValue + increment);

      if (nextValue === 0) {
        return "";
      }

      return nextValue.toFixed(2);
    });
  }, []);

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
      if (operation.type === "expense" && goalCategorySet.has(operation.category.toLowerCase())) {
        return acc;
      }

      const amountInBase = convertToBase(operation.amount, operation.currency, activeSettings);

      if (operation.type === "income") {
        return acc + amountInBase;
      }

      let nextValue = acc - amountInBase;
      const debtPaymentAmount = extractDebtPaymentAmount(operation.source);

      if (debtPaymentAmount > 0) {
        const paymentInBase = convertToBase(debtPaymentAmount, operation.currency, activeSettings);
        nextValue += paymentInBase;
      }

      return nextValue;
    }, 0);

    return operationsBalance + balanceEffect;
  }, [operations, balanceEffect, goalCategorySet, settings]);

  const netBalance = useMemo(
    () => balance - borrowed + lent,
    [balance, borrowed, lent]
  );

  const activeSettings = settings ?? DEFAULT_SETTINGS;
  const balanceFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: activeSettings.baseCurrency
      }),
    [activeSettings.baseCurrency]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!canManage) {
      setError("Недостаточно прав для добавления операции");
      return;
    }

    if (!category) {
      setError("Выберите категорию");
      return;
    }

    if (!wallet) {
      setError("Выберите кошелёк");
      return;
    }

    const numericAmount = Number(amount);
    const selectedType = type;
    const selectedCategory = category;

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Введите корректную сумму больше нуля");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/operations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: selectedType,
          amount: numericAmount,
          currency,
          category: selectedCategory,
          wallet,
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
      setAmount("");
      setType("income");
      setComment("");

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

  const handleDelete = async (id: string) => {
    if (!canManage) {
      setError("Недостаточно прав для удаления операции");
      return;
    }

    setError(null);
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
              className="rounded-2xl shadow-lg"
              style={{
                backgroundColor: "var(--surface-subtle)",
                overflow: "hidden"
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
                  padding: "1rem 1.25rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem"
                }}
                aria-expanded={showBalanceDetails}
              >
                Подробнее
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: "1.25rem",
                    lineHeight: 1,
                    transform: showBalanceDetails ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease"
                  }}
                >
                  ⌄
                </span>
              </summary>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  borderTop: "1px solid var(--border-muted)"
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

            <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.75rem",
              background: "rgba(12, 15, 35, 0.9)",
              padding: "2rem",
              borderRadius: "1.5rem",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              boxShadow: "0 24px 60px rgba(8, 12, 30, 0.55)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Тип операции</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  padding: "0.9rem 1.1rem",
                  borderRadius: "1.25rem",
                  background: "rgba(30, 41, 59, 0.65)",
                  border: "1px solid rgba(79, 70, 229, 0.35)",
                  boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.4)",
                  backdropFilter: "blur(14px)",
                  transition: "border 0.3s ease, background 0.3s ease"
                }}
              >
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Приход / расход</span>
                <button
                  type="button"
                  onClick={() => setType(type === "income" ? "expense" : "income")}
                  disabled={!canManage || loading}
                  aria-pressed={type === "income"}
                  style={{
                    position: "relative",
                    width: "7rem",
                    height: "2.8rem",
                    borderRadius: "9999px",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background:
                      type === "income"
                        ? "linear-gradient(135deg, rgba(52, 211, 153, 0.9), rgba(110, 231, 183, 0.45))"
                        : "linear-gradient(135deg, rgba(248, 113, 113, 0.9), rgba(248, 113, 113, 0.4))",
                    color: "var(--text-on-primary)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    cursor: !canManage || loading ? "not-allowed" : "pointer",
                    transition: "background 0.3s ease, transform 0.3s ease"
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: "6px",
                      width: "calc(50% - 6px)",
                      borderRadius: "9999px",
                      background: "rgba(15, 23, 42, 0.35)",
                      transform: type === "income" ? "translateX(0)" : "translateX(100%)",
                      transition: "transform 0.3s ease"
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "20%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "0.85rem"
                    }}
                  >
                    🟢
                  </span>
                  <span
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "18%",
                      transform: "translate(50%, -50%)",
                      fontSize: "0.85rem"
                    }}
                  >
                    🔴
                  </span>
                </button>
              </div>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Сумма</span>
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  borderRadius: "1.75rem",
                  padding: "1.6rem 1.25rem",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.3rem",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(18px)",
                  boxShadow: "0 14px 45px rgba(30, 64, 175, 0.35)",
                  transition: "border 0.3s ease, box-shadow 0.3s ease"
                }}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={handleAmountChange}
                  disabled={!canManage || loading}
                  placeholder="Сумма"
                  inputMode="decimal"
                  style={{
                    width: "100%",
                    textAlign: "center",
                    fontSize: "2.6rem",
                    fontWeight: 700,
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    outline: "none",
                    letterSpacing: "0.03em"
                  }}
                />
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
                  {[10, 50, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleQuickAmount(value)}
                      disabled={!canManage || loading}
                      style={{
                        padding: "0.45rem 1.2rem",
                        borderRadius: "9999px",
                        border: "1px solid rgba(148, 163, 184, 0.35)",
                        backgroundColor: "rgba(30, 41, 59, 0.65)",
                        color: "var(--text-muted)",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        cursor: !canManage || loading ? "not-allowed" : "pointer",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease"
                      }}
                      aria-label={`Добавить ${value}`}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.transform = "translateY(-2px)";
                        event.currentTarget.style.border = "1px solid rgba(129, 140, 248, 0.7)";
                        event.currentTarget.style.boxShadow = "0 8px 20px rgba(129, 140, 248, 0.25)";
                        event.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.transform = "translateY(0)";
                        event.currentTarget.style.border = "1px solid rgba(148, 163, 184, 0.35)";
                        event.currentTarget.style.boxShadow = "none";
                        event.currentTarget.style.color = "var(--text-muted)";
                      }}
                    >
                      +{value}
                    </button>
                  ))}
                </div>
              </div>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Валюта</span>
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  padding: "0.3rem",
                  borderRadius: "9999px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(139, 92, 246, 0.35)",
                  backdropFilter: "blur(12px)",
                  transition: "border 0.3s ease"
                }}
              >
                {SUPPORTED_CURRENCIES.map((item) => {
                  const isActive = currency === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrency(item)}
                      disabled={!canManage || loading}
                      style={{
                        flex: 1,
                        padding: "0.55rem 1.15rem",
                        borderRadius: "9999px",
                        border: isActive ? "1px solid transparent" : "1px solid rgba(148, 163, 184, 0.35)",
                        background: isActive
                          ? "linear-gradient(135deg, rgba(129, 140, 248, 0.95), rgba(56, 189, 248, 0.85))"
                          : "transparent",
                        color: isActive ? "#0f172a" : "var(--text-muted)",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        cursor: !canManage || loading ? "not-allowed" : "pointer",
                        transition: "all 0.25s ease"
                      }}
                      aria-pressed={isActive}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Кошелёк</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "1.1rem",
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(148, 163, 184, 0.25)"
                  }}
                >
                  <span aria-hidden style={{ fontSize: "1.1rem" }}>
                    {wallet ? getWalletIcon(wallet) : "👛"}
                  </span>
                  <select
                    value={wallet}
                    onChange={(event) => setWallet(event.target.value)}
                    disabled={!canManage || loading || wallets.length === 0}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: "var(--text-primary)",
                      fontSize: "1rem",
                      fontWeight: 500,
                      outline: "none"
                    }}
                  >
                    {wallets.length === 0 ? (
                      <option value="">Нет доступных кошельков</option>
                    ) : (
                      wallets.map((item) => (
                        <option key={item.id} value={item.name}>
                          {`${getWalletIcon(item.name)} ${item.name}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Категория</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "1.1rem",
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(148, 163, 184, 0.25)"
                  }}
                >
                  <span aria-hidden style={{ fontSize: "1.1rem" }}>📂</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    disabled={!canManage || loading || categorySuggestions.length === 0}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: "var(--text-primary)",
                      fontSize: "1rem",
                      fontWeight: 500,
                      outline: "none"
                    }}
                  >
                    {categorySuggestions.length === 0 ? (
                      <option value="">Нет доступных категорий</option>
                    ) : (
                      categorySuggestions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Комментарий</span>
              <button
                type="button"
                onClick={() => setIsCommentModalOpen(true)}
                disabled={!canManage || loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 1.05rem",
                  borderRadius: "9999px",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: comment
                    ? "linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(129, 140, 248, 0.35))"
                    : "transparent",
                  color: comment ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: 600,
                  cursor: !canManage || loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <span aria-hidden>📝</span>
                {comment ? "Изменить" : "Добавить"}
              </button>
            </div>

            <div
              style={{
                position: "sticky",
                bottom: "-2rem",
                margin: "0 -2rem -2rem",
                padding: "1.35rem 2rem 2rem",
                background:
                  "linear-gradient(180deg, rgba(12, 15, 35, 0) 0%, rgba(12, 15, 35, 0.88) 45%, rgba(12, 15, 35, 0.98) 100%)",
                backdropFilter: "blur(18px)",
                borderBottomLeftRadius: "1.5rem",
                borderBottomRightRadius: "1.5rem"
              }}
            >
              <button
                type="submit"
                disabled={!canManage || loading || !wallet || !category}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                  padding: "1.05rem 1.5rem",
                  borderRadius: "1.1rem",
                  border: "none",
                  background: "linear-gradient(135deg, #1d4ed8, #06b6d4)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  cursor: !canManage || loading || !wallet || !category ? "not-allowed" : "pointer",
                  boxShadow: "0 18px 45px rgba(6, 182, 212, 0.35)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease"
                }}
              >
                <span aria-hidden>➕</span>
                {loading ? "Добавляем..." : "Добавить"}
              </button>
            </div>
          </form>

          {isCommentModalOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Комментарий к операции"
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(2, 6, 23, 0.65)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50
              }}
            >
              <div
                style={{
                  width: "min(90vw, 420px)",
                  background: "rgba(12, 15, 35, 0.96)",
                  borderRadius: "1.5rem",
                  padding: "1.9rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  border: "1px solid rgba(129, 140, 248, 0.35)",
                  boxShadow: "0 24px 70px rgba(8, 12, 30, 0.65)"
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Комментарий</h3>
                <textarea
                  value={comment}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setComment(event.target.value)}
                  placeholder="Добавьте заметку"
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: "1rem",
                    padding: "1rem",
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(148, 163, 184, 0.35)",
                    color: "var(--text-primary)",
                    resize: "vertical",
                    minHeight: "6rem"
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setComment("");
                      setIsCommentModalOpen(false);
                    }}
                    style={{
                      padding: "0.6rem 1.1rem",
                      borderRadius: "0.85rem",
                      border: "1px solid rgba(148, 163, 184, 0.35)",
                      background: "transparent",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Очистить
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCommentModalOpen(false)}
                    style={{
                      padding: "0.6rem 1.25rem",
                      borderRadius: "0.85rem",
                      border: "none",
                      background: "linear-gradient(135deg, #1d4ed8, #06b6d4)",
                      color: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 14px 30px rgba(6, 182, 212, 0.35)"
                    }}
                  >
                    Готово
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {!canManage ? (
            <p style={{ color: "var(--text-muted)" }}>
              Вы вошли как наблюдатель — операции доступны только для просмотра.
            </p>
          ) : null}

          {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
        </section>


        <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h2 style={{ fontSize: "clamp(1.25rem, 4.5vw, 1.5rem)", fontWeight: 600 }}>
            Последние операции
          </h2>
          {operations.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              Пока нет данных — добавьте первую операцию.
            </p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {operations.map((operation) => (
                <li
                  key={operation.id}
                  data-card="split"
                  style={{
                    padding: "clamp(0.85rem, 2.5vw, 1rem)",
                    borderRadius: "var(--radius-2xl)",
                    border: "1px solid var(--border-strong)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1.25rem",
                    backgroundColor: "var(--surface-subtle)",
                    boxShadow: "var(--shadow-card)",
                    flexWrap: "wrap"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                      minWidth: "min(220px, 100%)"
                    }}
                  >
                    <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {operation.type === "income" ? "Приход" : "Расход"} — {operation.category}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      {new Date(operation.date).toLocaleString("ru-RU")}
                    </p>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      Кошелёк: {operation.wallet}
                    </p>
                    {operation.comment ? (
                      <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{operation.comment}</p>
                    ) : null}
                  </div>
                  <div
                    data-card-section="meta"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: canManage ? "flex-end" : "flex-start",
                      gap: "0.65rem",
                      minWidth: "min(140px, 100%)"
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: operation.type === "income" ? "var(--accent-success)" : "var(--accent-danger)",
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
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(operation.id)}
                        disabled={deletingId === operation.id}
                        data-variant="danger"
                        className="w-full"
                      >
                        {deletingId === operation.id ? "Удаляем..." : "Удалить"}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
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
