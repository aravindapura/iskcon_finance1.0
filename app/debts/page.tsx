"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Debt } from "@/lib/types";

const DebtsPage = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Debt["direction"]>("outgoing");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDebts = useCallback(async () => {
    try {
      const response = await fetch("/api/debts");
      if (!response.ok) {
        throw new Error("Не удалось загрузить долги");
      }

      const data = (await response.json()) as Debt[];
      setDebts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  }, []);

  useEffect(() => {
    loadDebts().catch(() => {
      setError("Не удалось загрузить долги");
    });
  }, [loadDebts]);

  const openDebts = useMemo(
    () => debts.filter((debt) => debt.status === "open"),
    [debts]
  );

  const { outgoingTotal, incomingTotal } = useMemo(() => {
    return openDebts.reduce(
      (totals, debt) => {
        if (debt.direction === "outgoing") {
          totals.outgoingTotal += debt.amount;
        } else {
          totals.incomingTotal += debt.amount;
        }
        return totals;
      },
      { outgoingTotal: 0, incomingTotal: 0 }
    );
  }, [openDebts]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const numericAmount = Number(amount);

    if (!trimmedName) {
      setError("Введите название долга");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Введите сумму больше нуля");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: trimmedName,
          amount: numericAmount,
          direction,
          comment: comment.trim() ? comment.trim() : undefined
        })
      });

      if (!response.ok) {
        throw new Error("Не удалось добавить долг");
      }

      const created = (await response.json()) as Debt;
      setDebts((prev) => [created, ...prev]);
      setName("");
      setAmount("");
      setDirection("outgoing");
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: string) => {
    setError(null);

    try {
      const response = await fetch("/api/debts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, action: "close" })
      });

      if (!response.ok) {
        throw new Error("Не удалось закрыть долг");
      }

      const updated = (await response.json()) as Debt;
      setDebts((prev) =>
        prev.map((debt) => (debt.id === updated.id ? { ...debt, status: updated.status } : debt))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  return (
    <section
      style={{
        width: "min(720px, 100%)",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        padding: "2rem",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "2rem"
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap"
          }}
        >
          <h1 style={{ fontSize: "2rem" }}>Управление долгами</h1>
          <Link
            href="/"
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "9999px",
              backgroundColor: "#ede9fe",
              color: "#5b21b6",
              fontWeight: 600
            }}
          >
            Вернуться к операциям
          </Link>
        </div>
        <p style={{ color: "#4b5563" }}>
          Добавляйте и закрывайте долги, чтобы отслеживать обязательства общины.
        </p>
      </header>

      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <form
          onSubmit={handleCreate}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "flex-end"
          }}
        >
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              flex: "1 1 240px"
            }}
          >
            <span>Название долга</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db"
              }}
              placeholder="Например, ремонт крыши"
              required
            />
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              flex: "1 1 160px"
            }}
          >
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

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              flex: "1 1 200px"
            }}
          >
            <span>Тип долга</span>
            <select
              value={direction}
              onChange={(event) => setDirection(event.target.value as Debt["direction"])}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db"
              }}
            >
              <option value="outgoing">Мы дали в долг</option>
              <option value="incoming">Нам дали в долг</option>
            </select>
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
              transition: "background-color 0.2s ease",
              flex: "0 1 180px",
              width: "100%"
            }}
          >
            {loading ? "Добавляем..." : "Добавить долг"}
          </button>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              flex: "1 1 100%"
            }}
          >
            <span>Комментарий</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db",
                resize: "vertical"
              }}
              placeholder="Дополнительные детали (необязательно)"
            />
          </label>
        </form>

        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap"
          }}
        >
          <h2 style={{ fontSize: "1.5rem" }}>Список долгов</h2>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              fontSize: "0.9rem",
              color: "#6b7280"
            }}
          >
            <span>Открытых: {openDebts.length}</span>
            <span>
              Мы дали: {outgoingTotal.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
            <span>
              Нам дали: {incomingTotal.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </div>
        </div>

        {debts.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Долгов пока нет. Добавьте первый долг.</p>
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
                  backgroundColor: "#f9fafb",
                  gap: "1rem",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <p style={{ fontWeight: 600 }}>{debt.name}</p>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0.25rem 0.65rem",
                      borderRadius: "9999px",
                      backgroundColor: debt.direction === "outgoing" ? "#ccfbf1" : "#dbeafe",
                      color: debt.direction === "outgoing" ? "#0f766e" : "#1d4ed8",
                      fontSize: "0.85rem",
                      fontWeight: 600
                    }}
                  >
                    {debt.direction === "outgoing" ? "Мы дали в долг" : "Нам дали в долг"}
                  </span>
                  <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                    {new Date(debt.date).toLocaleString("ru-RU")}
                  </p>
                  {debt.comment ? (
                    <p style={{ color: "#4b5563", fontSize: "0.95rem" }}>{debt.comment}</p>
                  ) : null}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                    justifyContent: "flex-end"
                  }}
                >
                  <span style={{ fontWeight: 700 }}>
                    {`${debt.amount.toLocaleString("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} USD`}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: debt.status === "open" ? "#b45309" : "#15803d"
                    }}
                  >
                    {debt.status === "open" ? "Открыт" : "Закрыт"}
                  </span>
                  {debt.status === "open" ? (
                    <button
                      type="button"
                      onClick={() => handleClose(debt.id)}
                      style={{
                        padding: "0.65rem 1.25rem",
                        borderRadius: "0.75rem",
                        border: "none",
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        fontWeight: 600
                      }}
                    >
                      Закрыть
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
};

export default DebtsPage;
