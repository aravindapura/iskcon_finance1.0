"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import AuthGate from "@/components/AuthGate";
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
            balanceEffect: acc.balanceEffect - amountInBase
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

  const { balanceEffect } = debtSummary;

  const balance = useMemo(() => {
    const activeSettings = settings ?? DEFAULT_SETTINGS;

    const operationsBalance = operations.reduce((acc, operation) => {
      if (operation.type === "expense" && goalCategorySet.has(operation.category.toLowerCase())) {
        return acc;
      }

      const amountInBase = convertToBase(operation.amount, operation.currency, activeSettings);

      return operation.type === "income" ? acc + amountInBase : acc - amountInBase;
    }, 0);

    return operationsBalance + balanceEffect;
  }, [operations, balanceEffect, goalCategorySet, settings]);

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
          category: selectedCategory,
          currency,
          wallet
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

      const created = (await response.json()) as Operation;
      setOperations((prev) => [created, ...prev]);
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#e2e8f0",
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
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
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
              backgroundColor: "#ccfbf1",
              color: "#0f766e",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(45, 212, 191, 0.25)"
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
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700 }}>
            Финансы храма — MVP
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Отслеживайте приход и расход средств, чтобы понимать финансовый баланс общины.
          </p>
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
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
              Текущий баланс
            </h2>
            <strong
              style={{
                fontSize: "1.75rem",
                color: balance >= 0 ? "#15803d" : "#b91c1c"
              }}
            >
              {balanceFormatter.format(balance)}
            </strong>
          </div>

          {initialLoading ? (
            <p style={{ color: "#64748b" }}>Загружаем данные...</p>
          ) : null}

          <form
            onSubmit={handleSubmit}
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
                  border: "1px solid #d1d5db"
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
                  border: "1px solid #d1d5db"
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
                  border: "1px solid #d1d5db"
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
                  border: "1px solid #d1d5db"
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
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #d1d5db"
                }}
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
              style={{
                padding: "0.95rem 1.5rem",
                borderRadius: "0.75rem",
                border: "none",
                backgroundColor: loading || !canManage ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                transition: "background-color 0.2s ease",
                boxShadow: "0 10px 20px rgba(37, 99, 235, 0.25)",
                width: "100%",
                cursor: !canManage || loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Добавляем..." : "Добавить"}
            </button>
          </form>

          {!canManage ? (
            <p style={{ color: "#64748b" }}>
              Вы вошли как наблюдатель — операции доступны только для просмотра.
            </p>
          ) : null}

          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
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
            <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "#0f172a" }}>
              Категории
            </h2>
            {canManage ? (
              <Link
                href="/settings/categories"
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "999px",
                  backgroundColor: "#e0e7ff",
                  color: "#1d4ed8",
                  fontWeight: 600,
                  boxShadow: "0 6px 16px rgba(59, 130, 246, 0.22)"
                }}
              >
                Управление категориями
              </Link>
            ) : null}
          </div>

          <p style={{ color: "#475569", margin: 0 }}>
            Список категорий используется для ввода операций. Добавление и удаление
            категорий перенесено в раздел настроек.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem"
            }}
          >
            <article
              style={{
                backgroundColor: "#f8fafc",
                padding: "1.25rem",
                borderRadius: "1rem",
                boxShadow: "0 10px 18px rgba(37, 99, 235, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem"
              }}
            >
              <h3 style={{ color: "#1d4ed8", fontWeight: 600 }}>Приход</h3>
              {incomeCategories.length === 0 ? (
                <p style={{ color: "#64748b", margin: 0 }}>
                  Категории прихода ещё не добавлены.
                </p>
              ) : (
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}
                >
                  {incomeCategories.map((item) => (
                    <li
                      key={item}
                      style={{
                        padding: "0.55rem 0.85rem",
                        borderRadius: "0.75rem",
                        backgroundColor: "#e0f2fe",
                        color: "#0f172a",
                        fontWeight: 500
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article
              style={{
                backgroundColor: "#fff7ed",
                padding: "1.25rem",
                borderRadius: "1rem",
                boxShadow: "0 10px 18px rgba(248, 113, 113, 0.12)",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem"
              }}
            >
              <h3 style={{ color: "#b45309", fontWeight: 600 }}>Расход</h3>
              {expenseBaseCategories.length === 0 ? (
                <p style={{ color: "#64748b", margin: 0 }}>
                  Категории расхода ещё не добавлены.
                </p>
              ) : (
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}
                >
                  {expenseBaseCategories.map((item) => (
                    <li
                      key={item}
                      style={{
                        padding: "0.55rem 0.85rem",
                        borderRadius: "0.75rem",
                        backgroundColor: "#fee2e2",
                        color: "#0f172a",
                        fontWeight: 500
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          {!canManage ? (
            <p style={{ color: "#64748b" }}>
              Изменение списков категорий доступно бухгалтеру.
            </p>
          ) : null}
        </section>


        <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
            Последние операции
          </h2>
          {operations.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              Пока нет данных — добавьте первую операцию.
            </p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {operations.map((operation) => (
                <li
                  key={operation.id}
                  style={{
                    padding: "1.1rem 1.35rem",
                    borderRadius: "1rem",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1.25rem",
                    backgroundColor: "#f8fafc",
                    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
                    flexWrap: "wrap"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                      minWidth: "220px"
                    }}
                  >
                    <p style={{ fontWeight: 600, color: "#0f172a" }}>
                      {operation.type === "income" ? "Приход" : "Расход"} — {operation.category}
                    </p>
                    <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                      {new Date(operation.date).toLocaleString("ru-RU")}
                    </p>
                    <p style={{ color: "#475569", fontSize: "0.9rem" }}>
                      Кошелёк: {operation.wallet}
                    </p>
                    {operation.comment ? (
                      <p style={{ color: "#475569", lineHeight: 1.5 }}>{operation.comment}</p>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: canManage ? "flex-end" : "flex-start",
                      gap: "0.65rem",
                      minWidth: "140px"
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: operation.type === "income" ? "#15803d" : "#b91c1c",
                        fontSize: "1.1rem"
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
                        style={{
                          padding: "0.55rem 0.95rem",
                          borderRadius: "0.75rem",
                          border: "1px solid #ef4444",
                          backgroundColor:
                            deletingId === operation.id ? "#fecaca" : "#fee2e2",
                          color: "#b91c1c",
                          fontWeight: 600,
                          cursor: deletingId === operation.id ? "not-allowed" : "pointer",
                          transition: "background-color 0.2s ease, transform 0.2s ease",
                          boxShadow: "0 10px 18px rgba(239, 68, 68, 0.15)",
                          width: "100%"
                        }}
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
      </main>
    </div>
  );
};

const Page = () => (
  <AuthGate>
    <Dashboard />
  </AuthGate>
);

export default Page;
