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
import { convertToBase, DEFAULT_SETTINGS } from "@/lib/currency";
import {
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

  const handleOpenForm = useCallback(
    (operationType: Operation["type"]) => {
      if (!canManage || loading) {
        return;
      }

      setError(null);
      setAmount("");
      setComment("");
      setShowCommentField(false);

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
      setAmount("");
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
                  gap: "0.75rem",
                  flexWrap: "wrap"
                }}
              >
                <button
                  type="button"
                  onClick={() => handleOpenForm("income")}
                  disabled={!canManage || loading}
                  style={{
                    padding: "0.85rem 1.5rem",
                    borderRadius: "9999px",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    backgroundColor:
                      formType === "income"
                        ? "rgba(34, 197, 94, 0.15)"
                        : "transparent",
                    color: "var(--accent-success)",
                    fontWeight: 600,
                    cursor: !canManage || loading ? "not-allowed" : "pointer",
                    transition: "background-color 0.2s ease, transform 0.2s ease"
                  }}
                >
                  + Доход
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenForm("expense")}
                  disabled={!canManage || loading}
                  style={{
                    padding: "0.85rem 1.5rem",
                    borderRadius: "9999px",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    backgroundColor:
                      formType === "expense"
                        ? "rgba(239, 68, 68, 0.15)"
                        : "transparent",
                    color: "var(--accent-danger)",
                    fontWeight: 600,
                    cursor: !canManage || loading ? "not-allowed" : "pointer",
                    transition: "background-color 0.2s ease, transform 0.2s ease"
                  }}
                >
                  – Расход
                </button>
              </div>

              {formType ? (
                <form
                  onSubmit={handleSubmit}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                    padding: "1.5rem",
                    borderRadius: "1rem",
                    border: "1px solid var(--border-muted)",
                    backgroundColor: "var(--surface-subtle)"
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem"
                    }}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                      Сумма
                    </span>
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
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.85rem",
                        border: "1px solid var(--border-muted)",
                        backgroundColor: "var(--surface-base)",
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        color: "var(--text-primary)"
                      }}
                    />
                  </label>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem"
                    }}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                      Кошелёк
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem"
                      }}
                    >
                      <select
                        value={wallet}
                        onChange={(event) => setWallet(event.target.value)}
                        disabled={!canManage || loading || wallets.length === 0}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          borderRadius: "0.85rem",
                          border: "1px solid var(--border-muted)",
                          backgroundColor: "var(--surface-base)",
                          color: "var(--text-primary)",
                          fontSize: "1rem",
                          fontWeight: 500
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
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Валюта: <strong>{selectedWalletInfo?.currency ?? activeSettings.baseCurrency}</strong>
                      </span>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem"
                    }}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                      {formType === "income" ? "Источник дохода" : "Категория"}
                    </span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      disabled={!canManage || loading}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.85rem",
                        border: "1px solid var(--border-muted)",
                        backgroundColor: "var(--surface-base)",
                        color: "var(--text-primary)",
                        fontSize: "1rem",
                        fontWeight: 500
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
                        gap: "0.5rem"
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem"
                        }}
                      >
                        <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                          Комментарий
                        </span>
                        <textarea
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          rows={3}
                          style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            borderRadius: "0.85rem",
                            border: "1px solid var(--border-muted)",
                            backgroundColor: "var(--surface-base)",
                            color: "var(--text-primary)",
                            resize: "vertical"
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
                          color: "var(--text-muted)",
                          fontSize: "0.85rem"
                        }}
                      >
                        Скрыть комментарий
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCommentField(true)}
                      disabled={!canManage || loading}
                      style={{
                        alignSelf: "flex-start",
                        color: "var(--text-muted)",
                        fontSize: "0.9rem",
                        textDecoration: "underline",
                        textDecorationStyle: "dashed"
                      }}
                    >
                      Добавить комментарий
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
                      cursor: !canManage || loading ? "not-allowed" : "pointer"
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
