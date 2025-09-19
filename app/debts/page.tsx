"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Debt } from "@/lib/types";

const DebtPage = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [type, setType] = useState<Debt["type"]>("borrowed");
  const [amount, setAmount] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDebts = async () => {
      try {
        const response = await fetch("/api/debts");
        if (!response.ok) {
          throw new Error("Не удалось загрузить долги");
        }

        const data = (await response.json()) as Debt[];
        setDebts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      }
    };

    void loadDebts();
  }, []);

  const totals = useMemo(
    () =>
      debts.reduce(
        (acc, debt) => {
          if (debt.status === "closed") {
            return acc;
          }

          if (debt.type === "borrowed") {
            return {
              ...acc,
              borrowed: acc.borrowed + debt.amount,
              balanceEffect: acc.balanceEffect - debt.amount
            };
          }

          return {
            ...acc,
            lent: acc.lent + debt.amount,
            balanceEffect: acc.balanceEffect + debt.amount
          };
        },
        { borrowed: 0, lent: 0, balanceEffect: 0 }
      ),
    [debts]
  );

  const { borrowed, lent } = totals;

  const handleDelete = async (id: string) => {
    setError(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/debts?id=${id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Не удалось удалить долг");
      }

      setDebts((prev) => prev.filter((debt) => debt.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Введите корректную сумму больше нуля");
      return;
    }

    const payload: Record<string, string | number> = {
      type,
      amount: numericAmount
    };

    if (type === "borrowed") {
      if (!from.trim()) {
        setError("Укажите, от кого получен долг");
        return;
      }

      payload.from = from.trim();
    } else {
      if (!to.trim()) {
        setError("Укажите, кому выдали долг");
        return;
      }

      payload.to = to.trim();
    }

    if (comment.trim()) {
      payload.comment = comment.trim();
    }

    setLoading(true);

    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Не удалось сохранить долг");
      }

      const created = (await response.json()) as Debt;
      setDebts((prev) => [created, ...prev]);
      setAmount("");
      setFrom("");
      setTo("");
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        width: "min(720px, 100%)",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        padding: "2rem",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
        display: "flex",
        flexDirection: "column",
        gap: "2rem"
      }}
    >
      <nav
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap"
        }}
      >
        <Link
          href="/"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            backgroundColor: "#e0f2fe",
            color: "#075985",
            fontWeight: 600
          }}
        >
          Главная
        </Link>
        <Link
          href="/debts"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            backgroundColor: "#e0e7ff",
            color: "#3730a3",
            fontWeight: 600
          }}
        >
          Долги
        </Link>
        <Link
          href="/planning"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            backgroundColor: "#dcfce7",
            color: "#15803d",
            fontWeight: 600
          }}
        >
          Планирование
        </Link>
        <Link
          href="/reports"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            backgroundColor: "#fef3c7",
            color: "#b45309",
            fontWeight: 600
          }}
        >
          Отчёты
        </Link>
      </nav>



      <header style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Учёт долгов</h1>
        <p style={{ color: "#4b5563" }}>
          Сохраняйте, кто и кому должен, чтобы учитывать их в общем балансе.
        </p>
      </header>

      <section style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "1rem",
            backgroundColor: "#ecfdf5",
            color: "#166534"
          }}
        >
          <p style={{ fontWeight: 600 }}>Нам заняли</p>
          <p style={{ marginTop: "0.25rem" }}>
            {borrowed.toLocaleString("ru-RU", {
              style: "currency",
              currency: "USD"
            })}
          </p>
        </div>
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "1rem",
            backgroundColor: "#fef2f2",
            color: "#991b1b"
          }}
        >
          <p style={{ fontWeight: 600 }}>Мы заняли другим</p>
          <p style={{ marginTop: "0.25rem" }}>
            {lent.toLocaleString("ru-RU", {
              style: "currency",
              currency: "USD"
            })}
          </p>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Добавить долг</h2>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem"
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span>Сумма</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db"
              }}
              required
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span>Тип</span>
            <select
              value={type}
              onChange={(event) => {
                const nextType = event.target.value as Debt["type"];
                setType(nextType);
                setFrom("");
                setTo("");
              }}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db"
              }}
            >
              <option value="borrowed">Нам заняли</option>
              <option value="lent">Мы заняли</option>
            </select>
          </label>

          {type === "borrowed" ? (
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>От кого</span>
              <input
                type="text"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #d1d5db"
                }}
                placeholder="Имя или организация"
                required
              />
            </label>
          ) : (
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span>Кому</span>
              <input
                type="text"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #d1d5db"
                }}
                placeholder="Имя или организация"
                required
              />
            </label>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span>Комментарий</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db",
                minHeight: "100px",
                resize: "vertical"
              }}
              placeholder="Условия возврата, контакты и т.д."
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.85rem 1.75rem",
              borderRadius: "0.75rem",
              border: "none",
              backgroundColor: loading ? "#1d4ed8" : "#2563eb",
              color: "#ffffff",
              fontWeight: 600,
              transition: "background-color 0.2s ease"
            }}
          >
            {loading ? "Сохраняем..." : "Добавить"}
          </button>
        </form>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Открытые долги</h2>
        {debts.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Пока нет записей о долгах.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {debts.map((debt) => (
              <li
                key={debt.id}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "1rem",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: debt.type === "borrowed" ? "#f0fdf4" : "#fef2f2"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <p style={{ fontWeight: 600 }}>
                    {debt.type === "borrowed" ? "Нам заняли" : "Мы заняли"} — {debt.amount.toLocaleString("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} USD
                  </p>
                  <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                    {new Date(debt.date).toLocaleString("ru-RU")}
                  </p>
                  <p style={{ color: "#4b5563" }}>
                    {debt.type === "borrowed" ? `От кого: ${debt.from}` : `Кому: ${debt.to}`}
                  </p>
                  {debt.comment ? (
                    <p style={{ color: "#4b5563" }}>{debt.comment}</p>
                  ) : null}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "0.5rem"
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: debt.type === "borrowed" ? "#15803d" : "#b91c1c"
                    }}
                  >
                    {debt.type === "borrowed" ? "+" : "-"}
                    {debt.amount.toLocaleString("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                    {" USD"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(debt.id)}
                    disabled={deletingId === debt.id}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #ef4444",
                      backgroundColor:
                        deletingId === debt.id ? "#fecaca" : "rgba(254, 226, 226, 0.6)",
                      color: "#b91c1c",
                      fontWeight: 600,
                      cursor: deletingId === debt.id ? "not-allowed" : "pointer"
                    }}
                  >
                    {deletingId === debt.id ? "Удаляем..." : "Удалить"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default DebtPage;
