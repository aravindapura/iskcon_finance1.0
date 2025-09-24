"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
  type Wallet
} from "@/lib/types";
import { extractDebtPaymentAmount } from "@/lib/debtPayments";

type CategoriesResponse = {
  income: string[];
  expense: string[];
};

type WalletsResponse = {
  wallets: Wallet[];
};

const Dashboard = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "accountant";

  const [operations, setOperations] = useState<Operation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<Operation["type"]>("income");
  const [category, setCategory] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>(DEFAULT_SETTINGS.baseCurrency);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [wallet, setWallet] = useState<Wallet>("");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseBaseCategories, setExpenseBaseCategories] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!user) {
      return;
    }

    setInitialLoading(true);
    setError(null);

    try {
      const [
        operationsResponse,
        debtsResponse,
        goalsResponse,
        settingsResponse,
        categoriesResponse,
        walletsResponse
      ] = await Promise.all([
        fetch("/api/operations"),
        fetch("/api/debts"),
        fetch("/api/goals"),
        fetch("/api/settings"),
        fetch("/api/categories"),
        fetch("/api/wallets")
      ]);

      const responses = [
        operationsResponse,
        debtsResponse,
        goalsResponse,
        settingsResponse,
        categoriesResponse,
        walletsResponse
      ];

      if (responses.some((response) => response.status === 401)) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      const failed = responses.find((response) => !response.ok);

      if (failed) {
        throw new Error("Не удалось загрузить данные");
      }

      const [
        operationsData,
        debtsData,
        goalsData,
        settingsData,
        categoriesData,
        walletsData
      ] = await Promise.all([
        operationsResponse.json() as Promise<Operation[]>,
        debtsResponse.json() as Promise<Debt[]>,
        goalsResponse.json() as Promise<Goal[]>,
        settingsResponse.json() as Promise<Settings>,
        categoriesResponse.json() as Promise<CategoriesResponse>,
        walletsResponse.json() as Promise<WalletsResponse>
      ]);

      setOperations(operationsData);
      setDebts(debtsData);
      setGoals(goalsData);
      setSettings(settingsData);
      setCurrency(settingsData.baseCurrency);
      setIncomeCategories(categoriesData.income);
      setExpenseBaseCategories(categoriesData.expense);
      const walletList = Array.isArray(walletsData.wallets) ? walletsData.wallets : [];
      setWallets(walletList);
      setWallet((current) => {
        if (walletList.length === 0) {
          return "";
        }

        if (current) {
          const matched = walletList.find(
            (item) => item.toLowerCase() === current.toLowerCase()
          );

          if (matched) {
            return matched;
          }
        }

        return walletList[0];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setInitialLoading(false);
    }
  }, [user, refresh]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const reloadGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/goals");

      if (response.status === 401) {
        await refresh();
        throw new Error("Сессия истекла, войдите заново.");
      }

      if (!response.ok) {
        throw new Error("Не удалось загрузить цели");
      }

      const data = (await response.json()) as Goal[];
      setGoals(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      throw err;
    }
  }, [refresh]);

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

  useEffect(() => {
    if (type === "income") {
      if (incomeCategories.length === 0) {
        if (category !== "") {
          setCategory("");
        }
        return;
      }

      if (!incomeCategories.includes(category)) {
        setCategory(incomeCategories[0]);
      }

      return;
    }

    if (expenseOptions.length === 0) {
      if (category !== "") {
        setCategory("");
      }
      return;
    }

    if (!expenseOptions.includes(category)) {
      setCategory(expenseOptions[0]);
    }
  }, [type, incomeCategories, expenseOptions, category]);

  useEffect(() => {
    if (wallets.length === 0) {
      if (wallet !== "") {
        setWallet("");
      }
      return;
    }

    if (!wallets.some((item) => item.toLowerCase() === wallet.toLowerCase())) {
      setWallet(wallets[0]);
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

        if (debt.type === "borrowed") {
          return {
            ...acc,
            borrowed: acc.borrowed + amountInBase,
            balanceEffect: acc.balanceEffect + amountInBase
          };
        }

        return {
          ...acc,
          lent: acc.lent + amountInBase,
          balanceEffect: acc.balanceEffect + amountInBase
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
          comment: null,
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

      const operationsResponse = await fetch("/api/operations");

      if (operationsResponse.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (!operationsResponse.ok) {
        throw new Error("Не удалось загрузить операции");
      }

      const operationsData = (await operationsResponse.json()) as Operation[];
      setOperations(operationsData);
      setAmount("");
      setType("income");

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

      if (deleted.type === "expense" && goalCategorySet.has(deleted.category.toLowerCase())) {
        void reloadGoals().catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeletingId(null);
    }
  };
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
                fontSize: "clamp(1.45rem, 4.5vw, 1.75rem)",
                color: balance >= 0 ? "var(--accent-success)" : "var(--accent-danger)"
              }}
            >
              {balanceFormatter.format(balance)}
            </strong>
          </div>

          <div
            className="rounded-2xl shadow-lg p-4"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              backgroundColor: "var(--surface-subtle)",
              border: "1px solid var(--border-strong)"
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Net Balance</h3>
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

          {initialLoading ? (
            <p style={{ color: "var(--text-muted)" }}>Загружаем данные...</p>
          ) : null}

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
              <select
                value={type}
                onChange={(event) => {
                  const newType = event.target.value as Operation["type"];
                  setType(newType);
                }}
                disabled={!canManage || loading}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-muted)"
                }}
              >
                <option value="income">Приход</option>
                <option value="expense">Расход</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Сумма</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={!canManage || loading}
                placeholder="0.00"
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-muted)"
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Валюта</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
                disabled={!canManage || loading}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-muted)"
                }}
              >
                {SUPPORTED_CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
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
                    <option key={item} value={item}>
                      {item}
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
                disabled={!canManage || loading ||
                  (type === "income"
                    ? incomeCategories.length === 0
                    : expenseOptions.length === 0)}
              >
                {(type === "income" ? incomeCategories : expenseOptions).length === 0 ? (
                  <option value="">
                    {type === "income"
                      ? "Нет категорий прихода"
                      : "Нет категорий расхода"}
                  </option>
                ) : (
                  (type === "income" ? incomeCategories : expenseOptions).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))
                )}
              </select>
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
    </PageContainer>
  );
};

const Page = () => (
  <AuthGate>
    <Dashboard />
  </AuthGate>
);

export default Page;
