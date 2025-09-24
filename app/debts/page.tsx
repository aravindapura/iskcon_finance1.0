"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import {
  convertToBase,
  DEFAULT_SETTINGS,
  SUPPORTED_CURRENCIES
} from "@/lib/currency";
import { type Currency, type Debt, type Settings, type Wallet } from "@/lib/types";

type WalletsResponse = {
  wallets: Wallet[];
};

const DebtsContent = () => {
  const { user, refresh } = useSession();

  if (!user) {
    return null;
  }

  const canManage = user.role === "accountant";

  const [debts, setDebts] = useState<Debt[]>([]);
  const [type, setType] = useState<Debt["type"]>("borrowed");
  const [amount, setAmount] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>(DEFAULT_SETTINGS.baseCurrency);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [wallet, setWallet] = useState<Wallet>("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadDebts = async () => {
      setError(null);
      setInitialLoading(true);

      try {
        const [debtsResponse, settingsResponse, walletsResponse] = await Promise.all([
          fetch("/api/debts"),
          fetch("/api/settings"),
          fetch("/api/wallets")
        ]);

        if (
          debtsResponse.status === 401 ||
          settingsResponse.status === 401 ||
          walletsResponse.status === 401
        ) {
          setError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (!debtsResponse.ok) {
          throw new Error("Не удалось загрузить долги");
        }

        if (!settingsResponse.ok) {
          throw new Error("Не удалось загрузить настройки");
        }

        if (!walletsResponse.ok) {
          throw new Error("Не удалось загрузить список кошельков");
        }

        const [debtsData, settingsData, walletsData] = await Promise.all([
          debtsResponse.json() as Promise<Debt[]>,
          settingsResponse.json() as Promise<Settings>,
          walletsResponse.json() as Promise<WalletsResponse>
        ]);

        setDebts(debtsData);
        setSettings(settingsData);
        setCurrency(settingsData.baseCurrency);
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
    };

    void loadDebts();
  }, [user, refresh]);

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

  const totals = useMemo(() => {
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

  const { borrowed, lent } = totals;
  const activeSettings = settings ?? DEFAULT_SETTINGS;
  const baseFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: activeSettings.baseCurrency
      }),
    [activeSettings.baseCurrency]
  );

  const handleDelete = async (id: string) => {
    if (!canManage) {
      setError("Недостаточно прав для удаления записи о долге");
      return;
    }

    setError(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/debts?id=${id}`, { method: "DELETE" });

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для удаления записи о долге");
        return;
      }

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

    if (!canManage) {
      setError("Недостаточно прав для добавления долга");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Введите корректную сумму больше нуля");
      return;
    }

    if (!wallet) {
      setError("Выберите кошелёк");
      return;
    }

    const payload: Record<string, string | number> = {
      type,
      amount: numericAmount,
      currency,
      wallet
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

      if (response.status === 401) {
        setError("Сессия истекла, войдите заново.");
        await refresh();
        return;
      }

      if (response.status === 403) {
        setError("Недостаточно прав для добавления долга");
        return;
      }

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
    <PageContainer activeTab="debts">
      <header className="page-header">
        <h1 className="page-header__title" style={{ fontSize: "1.85rem" }}>
          Управление долгами
        </h1>
        <p className="page-header__description">
          Отслеживайте займы и возвраты, чтобы понимать обязательства общины.
        </p>
      </header>

      <section
        data-layout="stat-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
      >
        <article
          style={{
            backgroundColor: "var(--surface-subtle)",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)"
          }}
        >
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            Мы должны
          </h2>
          <strong style={{ fontSize: "1.5rem", color: "var(--accent-danger)" }}>
            {baseFormatter.format(borrowed)}
          </strong>
        </article>
        <article
          style={{
            backgroundColor: "var(--surface-success-strong)",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 12px 24px rgba(34, 197, 94, 0.15)"
          }}
        >
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            Нам должны
          </h2>
          <strong style={{ fontSize: "1.5rem", color: "var(--accent-success)" }}>
            {baseFormatter.format(lent)}
          </strong>
        </article>
      </section>

      <form onSubmit={handleSubmit} data-layout="responsive-form">
        <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span>Тип</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as Debt["type"])}
            disabled={!canManage || loading}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid var(--border-muted)"
            }}
          >
            <option value="borrowed">Взяли</option>
            <option value="lent">Выдали</option>
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
          <span>{type === "borrowed" ? "От кого" : "Кому"}</span>
          <input
            type="text"
            value={type === "borrowed" ? from : to}
            onChange={(event) => (type === "borrowed" ? setFrom(event.target.value) : setTo(event.target.value))}
            disabled={!canManage || loading}
            placeholder={type === "borrowed" ? "Имя кредитора" : "Имя получателя"}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid var(--border-muted)"
            }}
          />
        </label>

        <label style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span>Комментарий</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={!canManage || loading}
            rows={3}
            placeholder="Дополнительная информация"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid var(--border-muted)",
              resize: "vertical"
            }}
          />
        </label>

        <button
          type="submit"
          disabled={!canManage || loading || !wallet}
          data-variant="primary"
        >
          {loading ? "Добавляем..." : "Добавить"}
        </button>
      </form>

      {!canManage ? (
        <p style={{ color: "var(--text-muted)" }}>
          Вы вошли как наблюдатель — формы доступны только для просмотра.
        </p>
      ) : null}

      {initialLoading ? <p style={{ color: "var(--text-muted)" }}>Загружаем данные...</p> : null}

      {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}

      <section className="page-section" style={{ gap: "1rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 600 }}>
          Текущие долги
        </h2>
        {debts.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>
            Пока нет записей о долгах.
          </p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {debts.map((debt) => (
              <li
                key={debt.id}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "1rem",
                  border: "1px solid var(--border-strong)",
                  backgroundColor: "var(--surface-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem"
                }}
              >
                <div
                  data-card="split"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <strong>
                      {debt.type === "borrowed" ? "Взяли" : "Выдали"} — {debt.amount.toLocaleString("ru-RU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}{" "}
                      {debt.currency}
                    </strong>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      {new Date(debt.date).toLocaleString("ru-RU")}
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      Кошелёк: {debt.wallet}
                    </span>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(debt.id)}
                      disabled={deletingId === debt.id}
                      data-variant="danger"
                    >
                      {deletingId === debt.id ? "Удаляем..." : "Удалить"}
                    </button>
                  ) : null}
                </div>
                {debt.comment ? (
                  <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{debt.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
};

const DebtsPage = () => (
  <AuthGate>
    <DebtsContent />
  </AuthGate>
);

export default DebtsPage;
