"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import TypeTargets, { type OperationType } from "@/components/TypeTargets";
import TransactionModal, {
  type TransactionDraft
} from "@/components/TransactionModal";
import WalletList from "@/components/WalletList";
import { fetcher, type FetcherError } from "@/lib/fetcher";
import type { Operation, WalletWithCurrency } from "@/lib/types";
import styles from "./page.module.css";

type WalletsResponse = { wallets: WalletWithCurrency[] };
type CategoriesResponse = { income: string[]; expense: string[] };
type TransactionsResponse = { transactions: Operation[] };

type SaveResponse = { transaction?: Operation; error?: string };

const nowForInput = () => {
  const date = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);

const formatDate = (iso: string) => {
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
};

const DashboardPage = () => {
  const router = useRouter();
  const { user } = useSession();

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<OperationType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftTx, setDraftTx] = useState<TransactionDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: walletsData,
    error: walletsError,
    isLoading: walletsLoading
  } = useSWR<WalletsResponse>(user ? "/api/wallets" : null, fetcher);
  const {
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading
  } = useSWR<CategoriesResponse>(user ? "/api/categories" : null, fetcher);
  const {
    data: transactionsData,
    error: transactionsError,
    isLoading: transactionsLoading,
    mutate: mutateTransactions
  } = useSWR<TransactionsResponse>(user ? "/api/transactions" : null, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000
  });

  const wallets = walletsData?.wallets ?? [];
  const transactions = transactionsData?.transactions ?? [];
  const activeWallet = selectedWalletId
    ? wallets.find((wallet) => wallet.id === selectedWalletId) ?? null
    : null;

  const categoriesForDraft = useMemo(() => {
    if (!draftTx) {
      return [];
    }

    if (draftTx.type === "INCOME") {
      return categoriesData?.income ?? [];
    }

    return categoriesData?.expense ?? [];
  }, [draftTx, categoriesData]);

  const listError: FetcherError | null =
    walletsError ?? categoriesError ?? transactionsError ?? null;
  const isLoading = walletsLoading || categoriesLoading || transactionsLoading;

  const resetDraft = useCallback(() => {
    setDraftTx(null);
    setSelectedType(null);
    setIsModalOpen(false);
    setFormError(null);
    setSubmitting(false);
  }, []);

  const handleWalletSelect = useCallback((walletId: string) => {
    setSelectedWalletId(walletId);
    setSelectedType(null);
    setDraftTx(null);
    setFormError(null);
  }, []);

  const openModalForType = useCallback(
    (type: OperationType) => {
      if (!selectedWalletId) {
        return;
      }

      const wallet = wallets.find((item) => item.id === selectedWalletId);
      const availableCategories =
        type === "INCOME"
          ? categoriesData?.income ?? []
          : categoriesData?.expense ?? [];

      setSelectedType(type);
      setDraftTx({
        walletId: selectedWalletId,
        type,
        amount: "",
        currency: wallet?.currency ?? "USD",
        date: nowForInput(),
        category: availableCategories[0] ?? "",
        description: ""
      });
      setIsModalOpen(true);
      setFormError(null);
    },
    [categoriesData, selectedWalletId, wallets]
  );

  const handleDraftChange = useCallback(
    <K extends keyof TransactionDraft>(field: K, value: TransactionDraft[K]) => {
      setDraftTx((prev) => {
        if (!prev) {
          return prev;
        }

        const next = { ...prev, [field]: value };

        if (field === "walletId") {
          const nextWallet = wallets.find((wallet) => wallet.id === value);

          if (nextWallet) {
            next.currency = nextWallet.currency;
          }

          setSelectedWalletId(value as string);
        }

        if (field === "type") {
          const nextType = value as OperationType;
          const availableCategories =
            nextType === "INCOME"
              ? categoriesData?.income ?? []
              : categoriesData?.expense ?? [];

          if (
            availableCategories.length > 0 &&
            !availableCategories.includes(next.category)
          ) {
            next.category = availableCategories[0];
          }
        }

        return next;
      });

      if (field === "type") {
        setSelectedType(value as OperationType);
      }
    },
    [categoriesData, wallets]
  );

  const handleCloseModal = useCallback(() => {
    resetDraft();
  }, [resetDraft]);

  const handleSubmit = useCallback(async () => {
    if (!draftTx) {
      return;
    }

    const amount = Number.parseFloat(draftTx.amount.replace(",", "."));

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Введите корректную сумму");
      return;
    }

    if (!draftTx.walletId) {
      setFormError("Выберите кошелёк");
      return;
    }

    if (!draftTx.category.trim()) {
      setFormError("Укажите категорию");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      walletId: draftTx.walletId,
      type: draftTx.type,
      amount,
      date: draftTx.date ? new Date(draftTx.date).toISOString() : undefined,
      description: draftTx.description.trim() || undefined,
      category: draftTx.category.trim(),
      currency: draftTx.currency
    };

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as SaveResponse | null;

      if (!response.ok || !data?.transaction) {
        const message = data?.error ?? "Не удалось сохранить операцию";
        setFormError(message);
        setSubmitting(false);
        return;
      }

      await mutateTransactions((current) => {
        const existing = current?.transactions ?? [];
        return { transactions: [data.transaction as Operation, ...existing] };
      }, { revalidate: false });

      resetDraft();
      void router.refresh();
    } catch (error) {
      console.error(error);
      setFormError("Не удалось сохранить операцию");
      setSubmitting(false);
    }
  }, [draftTx, mutateTransactions, resetDraft, router]);

  return (
    <AuthGate>
      <PageContainer activeTab="home">
        <div className={styles.screen}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Кошельки и операции</h1>
              <p className={styles.subtitle}>
                Выберите кошелёк, затем добавьте приход или расход
              </p>
            </div>
            {activeWallet ? (
              <div className={styles.selectedWallet}>
                <span className={styles.selectedLabel}>Выбран кошелёк</span>
                <span className={styles.selectedName}>{activeWallet.name}</span>
              </div>
            ) : null}
          </header>

          {listError ? (
            <div className={styles.errorBanner}>
              Не удалось загрузить данные. Попробуйте обновить страницу.
            </div>
          ) : null}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Кошельки</h2>
              {isLoading ? (
                <span className={styles.sectionNote}>Загружаем…</span>
              ) : null}
            </div>
            {wallets.length === 0 && !isLoading ? (
              <p className={styles.empty}>Кошельки ещё не добавлены.</p>
            ) : null}
            <WalletList
              wallets={wallets}
              selectedWalletId={selectedWalletId}
              onSelect={handleWalletSelect}
            />
          </section>

          {selectedWalletId ? (
            <div className={styles.targetsBlock}>
              <TypeTargets
                visible
                onPick={openModalForType}
                disabled={submitting}
                activeType={selectedType}
              />
            </div>
          ) : (
            <p className={styles.hint}>Нажмите на кошелёк, чтобы выбрать действия</p>
          )}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Недавние операции</h2>
              {transactionsLoading ? (
                <span className={styles.sectionNote}>Обновляем…</span>
              ) : null}
            </div>
            {transactions.length === 0 && !transactionsLoading ? (
              <p className={styles.empty}>Операций пока нет.</p>
            ) : null}
            {transactions.length > 0 ? (
              <ul className={styles.operations}>
                {transactions.map((operation) => (
                  <li key={operation.id} className={styles.operationItem}>
                    <div className={styles.operationMain}>
                      <span
                        className={
                          operation.type === "income"
                            ? styles.operationIncome
                            : styles.operationExpense
                        }
                      >
                        {operation.type === "income" ? "Приход" : "Расход"}
                      </span>
                      <span className={styles.operationWallet}>{operation.wallet}</span>
                    </div>
                    <div className={styles.operationMeta}>
                      <span className={styles.operationAmount}>
                        {formatAmount(operation.amount, operation.currency)}
                      </span>
                      <span className={styles.operationDate}>{formatDate(operation.date)}</span>
                    </div>
                    {operation.comment ? (
                      <p className={styles.operationComment}>{operation.comment}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        <TransactionModal
          open={isModalOpen}
          draft={draftTx}
          wallets={wallets}
          categories={categoriesForDraft}
          submitting={submitting}
          error={formError}
          onChange={handleDraftChange}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </AuthGate>
  );
};

export default DashboardPage;
