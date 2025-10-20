"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import { useSession } from "@/components/SessionProvider";
import { fetcher, type FetcherError } from "@/lib/fetcher";

type CategoriesResponse = {
  income: string[];
  expense: string[];
};

const CategoriesSettings = () => {
  const { user, refresh } = useSession();
  const canManage = (user?.role ?? "") === "admin";
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newIncome, setNewIncome] = useState("");
  const [newExpense, setNewExpense] = useState("");
  const [pendingType, setPendingType] = useState<"income" | "expense" | null>(null);
  const [deleting, setDeleting] = useState<
    { type: "income" | "expense"; name: string } | null
  >(null);
  const {
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading,
    mutate: mutateCategories
  } = useSWR<CategoriesResponse>(user ? "/api/categories" : null, fetcher, {
    revalidateOnFocus: true
  });

  const loading = categoriesLoading;

  useEffect(() => {
    if (!categoriesData) {
      return;
    }

    setIncomeCategories(Array.isArray(categoriesData.income) ? categoriesData.income : []);
    setExpenseCategories(Array.isArray(categoriesData.expense) ? categoriesData.expense : []);
  }, [categoriesData]);

  useEffect(() => {
    if (!categoriesError) {
      setError(null);
      return;
    }

    setMessage(null);

    if ((categoriesError as FetcherError).status === 401) {
      setError("Сессия истекла, войдите заново.");
      void refresh();
      return;
    }

    setError("Не удалось загрузить категории");
  }, [categoriesError, refresh]);

  if (!user) {
    return null;
  }

  const handleAdd = async (
    event: FormEvent<HTMLFormElement>,
    type: "income" | "expense"
  ) => {
    event.preventDefault();

    if (!canManage) {
      setError("Недостаточно прав для изменения категорий");
      return;
    }

    setMessage(null);
    setError(null);

    const value = (type === "income" ? newIncome : newExpense).trim();

    if (!value) {
      setError("Введите название категории");
      return;
    }

    const current = type === "income" ? incomeCategories : expenseCategories;

    if (current.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setError("Такая категория уже существует");
      return;
    }

    setPendingType(type);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type, name: value })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; name?: string }
        | null;

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для изменения категорий");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error ?? "Не удалось добавить категорию");
      }

      if (type === "income") {
        setIncomeCategories((prev) => [...prev, value]);
        setNewIncome("");
      } else {
        setExpenseCategories((prev) => [...prev, value]);
        setNewExpense("");
      }

      setMessage(`Категория «${value}» добавлена`);
      void mutateCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setPendingType(null);
    }
  };

  const handleDelete = async (type: "income" | "expense", name: string) => {
    if (!canManage) {
      setError("Недостаточно прав для изменения категорий");
      return;
    }

    setMessage(null);
    setError(null);
    setDeleting({ type, name });

    try {
      const response = await fetch("/api/categories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type, name })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; name?: string }
        | null;

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для изменения категорий");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error ?? "Не удалось удалить категорию");
      }

      if (type === "income") {
        setIncomeCategories((prev) => prev.filter((item) => item !== name));
      } else {
        setExpenseCategories((prev) => prev.filter((item) => item !== name));
      }

      setMessage(`Категория «${name}» удалена`);
      void mutateCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <main className="page-shell" style={{ maxWidth: "780px", width: "100%" }}>
      <section style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <nav className="app-navigation">
          <Link href="/settings" className="tab-pill" data-active="true">
            Настройки
          </Link>
          <Link href="/" className="tab-pill" data-active="false">
            Главная
          </Link>
        </nav>

        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <h1>Управление категориями</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Добавляйте и удаляйте категории прихода и расхода. Все операции сохраняются,
            даже если категорию удалить.
          </p>
        </header>

        {loading ? <p style={{ color: "var(--text-muted)" }}>Загружаем категории...</p> : null}

        <section
          data-layout="stat-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem"
          }}
        >
          {([
            {
              type: "income" as const,
              title: "Категории прихода",
              accent: "var(--accent-primary)",
              tint: "rgba(212, 168, 106, 0.18)",
              value: newIncome,
              onChange: setNewIncome,
              categories: incomeCategories
            },
            {
              type: "expense" as const,
              title: "Категории расхода",
              accent: "var(--accent-danger)",
              tint: "rgba(139, 46, 29, 0.15)",
              value: newExpense,
              onChange: setNewExpense,
              categories: expenseCategories
            }
          ]).map((config) => (
            <article
              key={config.type}
              style={{
                backgroundColor: "var(--surface-primary)",
                border: "1px solid var(--border-muted)",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h2
                  style={{
                    color: "var(--text-on-light)",
                    fontWeight: 700,
                    paddingBottom: "0.35rem",
                    borderBottom: `2px solid ${config.accent}`,
                    width: "fit-content"
                  }}
                >
                  {config.title}
                </h2>
                <form
                  onSubmit={(event) => handleAdd(event, config.type)}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <input
                    type="text"
                    value={config.value}
                    onChange={(event) => {
                      config.onChange(event.target.value);
                      setError(null);
                      setMessage(null);
                    }}
                    placeholder="Новая категория"
                    disabled={!canManage || pendingType === config.type}
                    className="w-full flex-1 min-w-0 rounded-xl border px-4 py-3"
                  />
                  <button
                    type="submit"
                    disabled={!canManage || pendingType === config.type}
                    className="inline-flex w-full items-center justify-center rounded-xl px-5 py-3 font-semibold whitespace-nowrap transition-colors sm:w-auto"
                    data-variant="primary"
                  >
                    {pendingType === config.type ? "Сохраняем..." : "Добавить"}
                  </button>
                </form>
              </div>

              {config.categories.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>Категории ещё не добавлены.</p>
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
                  {config.categories.map((item) => {
                    const isDeleting =
                      deleting?.type === config.type && deleting.name === item;

                    return (
                      <li
                        key={item}
                        data-card="split"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          padding: "0.6rem 0.9rem",
                          borderRadius: "0.75rem",
                          backgroundColor: config.tint,
                          border: "1px solid rgba(34, 38, 43, 0.08)"
                        }}
                      >
                        <span style={{ color: "var(--text-on-light)", fontWeight: 600 }}>{item}</span>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(config.type, item)}
                            disabled={isDeleting}
                            data-variant="danger"
                          >
                            {isDeleting ? "Удаляем..." : "Удалить"}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          ))}
        </section>

        {!canManage ? (
          <p style={{ color: "var(--text-muted)" }}>
            Вы вошли как наблюдатель — изменение категорий недоступно.
          </p>
        ) : null}

        {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
        {message ? <p style={{ color: "var(--accent-success-strong)" }}>{message}</p> : null}
      </section>
    </main>
  );
};

const CategoriesSettingsPage = () => (
  <AuthGate>
    <CategoriesSettings />
  </AuthGate>
);

export default CategoriesSettingsPage;
