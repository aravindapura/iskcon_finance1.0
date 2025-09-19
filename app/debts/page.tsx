"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Debt } from "@/lib/types";

const DebtsPage = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
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
            display: "grid",
            gridTemplateColumns: "2fr 1fr auto",
            gap: "1rem",
            alignItems: "end"
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
            {loading ? "Добавляем..." : "Добавить долг"}
          </button>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              gridColumn: "1 / span 3"
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.5rem" }}>Список долгов</h2>
          <span style={{ color: "#6b7280" }}>Открытых: {openDebts.length}</span>
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
                  backgroundColor: "#f9fafb"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <p style={{ fontWeight: 600 }}>{debt.name}</p>
                  <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                    {new Date(debt.date).toLocaleString("ru-RU")}
                  </p>
                  {debt.comment ? (
                    <p style={{ color: "#4b5563", fontSize: "0.95rem" }}>{debt.comment}</p>
                  ) : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
