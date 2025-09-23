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
import {
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  Target,
  TrendingUp
} from "lucide-react";

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

  const { activeGoals, completedGoals, goalsProgress } = useMemo(() => {
    const activeList = goals.filter((goal) => goal.status !== "done");
    const completedList = goals.filter((goal) => goal.status === "done");

    const progressValue =
      activeList.length === 0
        ? 0
        : Math.round(
            (activeList.reduce((acc, goal) => {
              if (!Number.isFinite(goal.targetAmount) || goal.targetAmount <= 0) {
                return acc;
              }

              const ratio = Math.max(
                0,
                Math.min(goal.currentAmount / goal.targetAmount, 1)
              );

              return acc + ratio;
            }, 0) /
              activeList.length) *
              100
          );

    return {
      activeGoals: activeList,
      completedGoals: completedList,
      goalsProgress: progressValue
    };
  }, [goals]);

  const debtTotal = debtSummary.borrowed + debtSummary.lent;
  const operationsCount = operations.length;
  const positiveBalance = balance >= 0;
  const balanceEffectLabel =
    balanceEffect === 0
      ? "без учёта долгов"
      : `${balanceEffect > 0 ? "+" : "-"}${balanceFormatter.format(Math.abs(balanceEffect))}`;

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
      <header className="flex flex-col gap-3">
        <span className="uppercase muted">Учёт доходов и расходов</span>
        <h1 className="page-title">Бухгалтерия ISKCON Batumi</h1>
        <p className="page-subtitle">
          Актуальные данные по приходу, расходу, долгам и целям общины в одном месте.
        </p>
      </header>

      <section className="grid-auto-fit">
        <article className="card stat-card">
          <div className="flex-between">
            <div className="flex flex-col gap-2">
              <span className="muted text-sm">Текущий баланс</span>
              <span className={`text-3xl font-semibold ${positiveBalance ? "text-success" : "text-danger"}`}>
                {balanceFormatter.format(balance)}
              </span>
            </div>
            <div className="card-muted rounded-2xl p-4">
              <PiggyBank aria-hidden="true" width={28} height={28} />
            </div>
          </div>
          <p className="muted text-sm">
            {balanceEffect === 0
              ? `Основано на ${operationsCount} операциях`
              : `С учётом долгов: ${balanceEffectLabel}`}
          </p>
        </article>

        <article className="card stat-card">
          <div className="flex-between">
            <div className="flex flex-col gap-2">
              <span className="muted text-sm">Общий объём долгов</span>
              <span className="text-2xl text-accent font-semibold">
                {balanceFormatter.format(debtTotal)}
              </span>
            </div>
            <div className="card-muted rounded-2xl p-4">
              <TrendingUp aria-hidden="true" width={28} height={28} />
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="muted">Мы должны</span>
              <span className="text-danger font-semibold">
                {balanceFormatter.format(debtSummary.borrowed)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="muted">Нам должны</span>
              <span className="text-success font-semibold">
                {balanceFormatter.format(debtSummary.lent)}
              </span>
            </div>
          </div>
        </article>

        <article className="card stat-card">
          <div className="flex-between">
            <div className="flex flex-col gap-2">
              <span className="muted text-sm">Цели общины</span>
              <span className="text-2xl text-accent font-semibold">
                {activeGoals.length} активных
              </span>
            </div>
            <div className="card-muted rounded-2xl p-4">
              <Target aria-hidden="true" width={28} height={28} />
            </div>
          </div>
          <p className="muted text-sm">Завершено: {completedGoals.length}</p>
          <div className="flex flex-col gap-2">
            <div className="progress-track">
              <span
                className="progress-indicator"
                style={{ width: `${goalsProgress}%` }}
              />
            </div>
            <span className="muted text-sm">Средний прогресс {goalsProgress}%</span>
          </div>
        </article>
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold">Новая операция</h2>
            <p className="muted text-sm">
              Добавляйте приходы и расходы, чтобы баланс оставался актуальным.
            </p>
          </div>
          <div className="card-muted rounded-2xl p-4">
            {type === "income" ? (
              <ArrowUpCircle aria-hidden="true" width={26} height={26} />
            ) : (
              <ArrowDownCircle aria-hidden="true" width={26} height={26} />
            )}
          </div>
        </div>
        {initialLoading ? <p className="muted text-sm">Загружаем данные...</p> : null}
        <form onSubmit={handleSubmit} data-layout="responsive-form" className="form-grid">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-black">Тип операции</span>
            <select
              value={type}
              onChange={(event) => {
                const newType = event.target.value as Operation["type"];
                setType(newType);
              }}
              disabled={!canManage || loading}
            >
              <option value="income">Приход</option>
              <option value="expense">Расход</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-black">Сумма</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={!canManage || loading}
              placeholder="0.00"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-black">Валюта</span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
              disabled={!canManage || loading}
            >
              {SUPPORTED_CURRENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-black">Кошелёк</span>
            <select
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              disabled={!canManage || loading || wallets.length === 0}
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

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-black">Категория</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={
                !canManage ||
                loading ||
                (type === "income"
                  ? incomeCategories.length === 0
                  : expenseOptions.length === 0)
              }
            >
              {(type === "income" ? incomeCategories : expenseOptions).length === 0 ? (
                <option value="">
                  {type === "income" ? "Нет категорий прихода" : "Нет категорий расхода"}
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
            className="btn btn-primary w-full"
            disabled={!canManage || loading || !wallet || !category}
          >
            {loading ? "Добавляем..." : "Добавить"}
          </button>
        </form>

        {!canManage ? (
          <p className="muted text-sm">
            Вы вошли как наблюдатель — операции доступны только для просмотра.
          </p>
        ) : null}

        {error ? <p className="text-danger text-sm">{error}</p> : null}
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold">Последние операции</h2>
            <p className="muted text-sm">
              {operationsCount === 0
                ? "Добавьте первую запись, чтобы увидеть историю."
                : `Всего операций: ${operationsCount}`}
            </p>
          </div>
        </div>
        {operationsCount === 0 ? (
          <p className="muted text-sm">
            Пока нет данных — добавьте первую операцию.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {operations.map((operation) => {
              const amountText = `${
                operation.type === "income" ? "+" : "-"
              }${operation.amount.toLocaleString("ru-RU", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })} ${operation.currency}`;
              const isIncome = operation.type === "income";

              return (
                <li key={operation.id} data-card="split">
                  <div className="flex flex-col gap-2 min-w-0">
                    <p className="font-semibold text-black">
                      {operation.type === "income" ? "Приход" : "Расход"} — {operation.category}
                    </p>
                    <p className="muted text-sm">
                      {new Date(operation.date).toLocaleString("ru-RU")}
                    </p>
                    <p className="muted text-sm">Кошелёк: {operation.wallet}</p>
                    {operation.comment ? <p className="text-sm">{operation.comment}</p> : null}
                  </div>
                  <div className={`flex flex-col gap-3 ${canManage ? "items-end" : "items-start"}`}>
                    <span className={`text-2xl font-semibold ${isIncome ? "text-success" : "text-danger"}`}>
                      {amountText}
                    </span>
                    {canManage ? (
                      <button
                        type="button"
                        className="btn btn-danger w-full"
                        onClick={() => handleDelete(operation.id)}
                        disabled={deletingId === operation.id}
                      >
                        {deletingId === operation.id ? "Удаляем..." : "Удалить"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
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
