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
              data-layout="responsive-form"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
                alignItems: "end"
              }}
            >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Тип операции</span>
              <div
                role="group"
                aria-label="Выбор типа операции"
                style={{ display: "flex", gap: "0.75rem" }}
              >
                <button
                  type="button"
                  onClick={() => setType("income")}
                  disabled={!canManage || loading}
                  aria-pressed={type === "income"}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border:
                      type === "income"
                        ? "1px solid var(--accent-success)"
                        : "1px solid var(--border-muted)",
                    backgroundColor:
                      type === "income"
                        ? "var(--accent-success-subtle, rgba(6, 147, 62, 0.12))"
                        : "var(--surface-elevated, var(--surface-subtle))",
                    color:
                      type === "income"
                        ? "var(--accent-success)"
                        : "var(--text-primary)",
                    fontWeight: 600,
                    cursor: !canManage || loading ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  🟢 Приход
                </button>
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  disabled={!canManage || loading}
                  aria-pressed={type === "expense"}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border:
                      type === "expense"
                        ? "1px solid var(--accent-danger)"
                        : "1px solid var(--border-muted)",
                    backgroundColor:
                      type === "expense"
                        ? "var(--accent-danger-subtle, rgba(220, 38, 38, 0.12))"
                        : "var(--surface-elevated, var(--surface-subtle))",
                    color:
                      type === "expense"
                        ? "var(--accent-danger)"
                        : "var(--text-primary)",
                    fontWeight: 600,
                    cursor: !canManage || loading ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  🔴 Расход
                </button>
              </div>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Сумма</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={handleAmountChange}
                disabled={!canManage || loading}
                placeholder="Введите сумму"
                inputMode="decimal"
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-muted)"
                }}
              />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[10, 50, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleQuickAmount(value)}
                    disabled={!canManage || loading}
                    style={{
                      padding: "0.4rem 0.75rem",
                      borderRadius: "9999px",
                      border: "1px solid var(--border-muted)",
                      backgroundColor: "var(--surface-elevated, var(--surface-subtle))",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: !canManage || loading ? "not-allowed" : "pointer"
                    }}
                    aria-label={`Добавить ${value}`}
                  >
                    +{value}
                  </button>
                ))}
              </div>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Валюта</span>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {SUPPORTED_CURRENCIES.map((item) => {
                  const isActive = currency === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrency(item)}
                      disabled={!canManage || loading}
                      style={{
                        padding: "0.5rem 0.85rem",
                        borderRadius: "9999px",
                        border: isActive
                          ? "1px solid var(--accent-primary)"
                          : "1px solid var(--border-muted)",
                        backgroundColor: isActive
                          ? "var(--accent-primary)"
                          : "var(--surface-elevated, var(--surface-subtle))",
                        color: isActive ? "var(--text-on-primary)" : "var(--text-muted)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: !canManage || loading ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease"
                      }}
                      aria-pressed={isActive}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Кошелёк</span>
              <select
                value={wallet}
                onChange={(event) => setWallet(event.target.value)}
                disabled={!canManage || loading || wallets.length === 0}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-muted)"
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
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Категория</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={!canManage || loading || categorySuggestions.length === 0}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-muted)"
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
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Комментарий</span>
              <textarea
                value={comment}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setComment(event.target.value)}
                disabled={!canManage || loading}
                placeholder="Например: пожертвование на праздник"
                rows={2}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-muted)",
                  resize: "vertical",
                  minHeight: "3.5rem"
                }}
              />
            </label>

            <button
              type="submit"
              disabled={!canManage || loading || !wallet || !category}
              data-variant="primary"
              className="w-full"
            >
              {loading ? "Добавляем..." : "Добавить"}
            </button>
          </form>

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
