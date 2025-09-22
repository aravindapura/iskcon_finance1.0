"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AuthGate from "@/components/AuthGate";
import { useSession } from "@/components/SessionProvider";

type CategoriesResponse = {
  income: string[];
  expense: string[];
};

const CategoriesSettings = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "accountant";
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newIncome, setNewIncome] = useState("");
  const [newExpense, setNewExpense] = useState("");
  const [pendingType, setPendingType] = useState<"income" | "expense" | null>(null);
  const [deleting, setDeleting] = useState<
    { type: "income" | "expense"; name: string } | null
  >(null);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/categories");

        if (response.status === 401) {
          setError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (!response.ok) {
          throw new Error("Не удалось загрузить категории");
        }

        const data = (await response.json().catch(() => null)) as
          | CategoriesResponse
          | null;

        if (!data) {
          throw new Error("Не удалось загрузить категории");
        }

        setIncomeCategories(Array.isArray(data.income) ? data.income : []);
        setExpenseCategories(Array.isArray(data.expense) ? data.expense : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setLoading(false);
      }
    };

    void loadCategories();
  }, [refresh]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <main
      className="page-shell bg-white text-black dark:bg-midnight dark:text-slate-100"
      style={{
        maxWidth: "780px",
        width: "100%",
        padding: "2.5rem 2.75rem",
        gap: "2rem"
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
            href="/settings"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: "var(--surface-violet)",
              color: "var(--accent-violet)",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)"
            }}
          >
            Настройки
          </Link>
          <Link
            href="/"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "999px",
              backgroundColor: "var(--surface-blue)",
              color: "var(--accent-blue)",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)"
            }}
          >
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
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--surface-navy)" }}>
            Управление категориями
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Добавляйте и удаляйте категории прихода и расхода. Все операции сохраняются,
            даже если категорию удалить.
          </p>
        </header>

        {loading ? <p style={{ color: "var(--text-muted)" }}>Загружаем категории...</p> : null}

        <section
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
              color: "var(--accent-blue)",
              background: "var(--surface-blue-soft)",
              value: newIncome,
              onChange: setNewIncome,
              categories: incomeCategories
            },
            {
              type: "expense" as const,
              title: "Категории расхода",
              color: "var(--accent-amber)",
              background: "var(--surface-amber-soft)",
              value: newExpense,
              onChange: setNewExpense,
              categories: expenseCategories
            }
          ]).map((config) => (
            <article
              key={config.type}
              style={{
                backgroundColor: config.background,
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 12px 24px rgba(59, 130, 246, 0.12)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h2 style={{ color: config.color, fontWeight: 600 }}>{config.title}</h2>
                <form
                  onSubmit={(event) => handleAdd(event, config.type)}
                  style={{ display: "flex", gap: "0.5rem" }}
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
                    style={{
                      flex: 1,
                      padding: "0.75rem 1rem",
                      borderRadius: "0.75rem",
                      border: "1px solid var(--border-muted)"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!canManage || pendingType === config.type}
                    style={{
                      padding: "0.75rem 1.25rem",
                      borderRadius: "0.75rem",
                      border: "none",
                      backgroundColor:
                        !canManage || pendingType === config.type ? "var(--accent-disabled-strong)" : "var(--accent-primary)",
                      color: "var(--surface-primary)",
                      fontWeight: 600,
                      cursor: !canManage || pendingType === config.type ? "not-allowed" : "pointer"
                    }}
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
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          padding: "0.6rem 0.9rem",
                          borderRadius: "0.75rem",
                          backgroundColor: "var(--surface-primary)"
                        }}
                      >
                        <span style={{ color: "var(--text-primary)" }}>{item}</span>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(config.type, item)}
                            disabled={isDeleting}
                            style={{
                              border: "none",
                              backgroundColor: "var(--accent-danger-bright)",
                              color: "var(--surface-primary)",
                              borderRadius: "999px",
                              padding: "0.35rem 0.85rem",
                              fontSize: "0.85rem",
                              cursor: isDeleting ? "not-allowed" : "pointer"
                            }}
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
        {message ? <p style={{ color: "var(--accent-teal-strong)" }}>{message}</p> : null}
    </main>
  );
};

const CategoriesSettingsPage = () => (
  <AuthGate>
    <CategoriesSettings />
  </AuthGate>
);

export default CategoriesSettingsPage;
