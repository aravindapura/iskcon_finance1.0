"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import {
  convertToBase,
  DEFAULT_SETTINGS,
  SUPPORTED_CURRENCIES
} from "@/lib/currency";
import { type Currency, type Debt, type Settings, type Wallet } from "@/lib/types";
import { fetcher, type FetcherError } from "@/lib/fetcher";
import { expandWalletDisplayNames } from "@/lib/walletAliases";

type WalletsResponse = {
  wallets: Wallet[];
};

const DebtsContent = () => {
  const { user, refresh } = useSession();
  const canManage = (user?.role ?? "") === "admin";

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
  const [activeSubmission, setActiveSubmission] = useState<"new" | "existing" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    data: debtsData,
    error: debtsError,
    isLoading: debtsLoading,
    mutate: mutateDebts
  } = useSWR<Debt[]>(user ? "/api/debts" : null, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000
  });

  const {
    data: settingsData,
    error: settingsError,
    isLoading: settingsLoading
  } = useSWR<Settings>(user ? "/api/settings" : null, fetcher, {
    revalidateOnFocus: true
  });

  const {
    data: walletsData,
    error: walletsError,
    isLoading: walletsLoading
  } = useSWR<WalletsResponse>(user ? "/api/wallets" : null, fetcher, {
    revalidateOnFocus: true
  });

  const initialLoading = debtsLoading || settingsLoading || walletsLoading;

  useEffect(() => {
    if (debtsData) {
      setDebts(debtsData);
    }
  }, [debtsData]);

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
      setCurrency(settingsData.baseCurrency);
    }
  }, [settingsData]);

  useEffect(() => {
    if (!walletsData) {
      return;
    }

    const walletList = Array.isArray(walletsData.wallets) ? walletsData.wallets : [];
    const expandedWallets = expandWalletDisplayNames(walletList);
    setWallets(expandedWallets);
    setWallet((current) => {
      if (expandedWallets.length === 0) {
        return "";
      }

      if (current) {
        const matched = expandedWallets.find(
          (item) => item.toLowerCase() === current.toLowerCase()
        );

        if (matched) {
          return matched;
        }
      }

      return expandedWallets[0];
    });
  }, [walletsData]);

  useEffect(() => {
    const currentError = debtsError || settingsError || walletsError;

    if (!currentError) {
      setError(null);
      return;
    }

    if ((currentError as FetcherError).status === 401) {
      setError("Сессия истекла, войдите заново.");
      void refresh();
      return;
    }

    setError("Не удалось загрузить данные");
  }, [debtsError, settingsError, walletsError, refresh]);

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
        const affectsBalance = debt.existing !== true;

        if (debt.type === "borrowed") {
          return {
            ...acc,
            borrowed: acc.borrowed + amountInBase,
            balanceEffect: affectsBalance
              ? acc.balanceEffect - amountInBase
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
      void mutateDebts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setDeletingId(null);
    }
  };

  const submitDebt = async (mode: "new" | "existing") => {
    if (activeSubmission) {
      return;
    }

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

    const payload: Record<string, string | number | boolean> = {
      type,
      amount: numericAmount,
      currency,
      wallet
    };

    if (mode === "existing") {
      payload.existing = true;
    }

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

    setActiveSubmission(mode);

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
      void mutateDebts();
      setAmount("");
      setFrom("");
      setTo("");
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setActiveSubmission(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitDebt("new");
  };

  const handleExistingSubmit = () => {
    void submitDebt("existing");
  };

  if (!user) {
    return null;
  }

  return (
    <PageContainer activeTab="debts">
      <header style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 700 }}>
          Управление долгами
        </h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Отслеживайте займы и возвраты, чтобы понимать обязательства общины.
        </p>
      </header>

      <section
        data-layout="stat-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem"
        }}
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

      <form
        onSubmit={handleSubmit}
        data-layout="responsive-form"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem"
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span>Тип</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as Debt["type"])}
            disabled={!canManage || activeSubmission !== null}
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
            disabled={!canManage || activeSubmission !== null}
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
            disabled={!canManage || activeSubmission !== null}
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
            disabled={!canManage || activeSubmission !== null || wallets.length === 0}
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
            onChange={(event) =>
              type === "borrowed" ? setFrom(event.target.value) : setTo(event.target.value)
            }
            disabled={!canManage || activeSubmission !== null}
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
            disabled={!canManage || activeSubmission !== null}
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
          disabled={!canManage || activeSubmission !== null || !wallet}
          data-variant="primary"
        >
          {activeSubmission === "new" ? "Добавляем..." : "Добавить"}
        </button>
        <button
          type="button"
          onClick={handleExistingSubmit}
          disabled={!canManage || activeSubmission !== null || !wallet}
          className="rounded-lg p-2 shadow"
          style={{
            gridColumn: "1 / -1",
            backgroundColor: "var(--surface-primary)",
            border: "1px solid var(--border-muted)",
            color: "var(--text-secondary-strong)",
            fontWeight: 600
          }}
        >
          {activeSubmission === "existing"
            ? "Сохраняем существующий долг..."
            : "Add existing debt"}
        </button>
      </form>

      {!canManage ? (
        <p style={{ color: "var(--text-muted)" }}>
          Вы вошли как наблюдатель — формы доступны только для просмотра.
        </p>
      ) : null}

      {initialLoading ? <p style={{ color: "var(--text-muted)" }}>Загружаем данные...</p> : null}

      {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}

      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
