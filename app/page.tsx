"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import TransactionModal from "@/components/TransactionModal";
import { type TransactionFormState, type TransactionType } from "@/components/TransactionForm";
import WalletTable, { type WalletRow } from "@/components/WalletTable";
import { useSession } from "@/components/SessionProvider";
import type { Operation } from "@/lib/types";

interface Wallet {
  id: string;
  display_name: string;
  balance: number;
  currency: string;
  category: string;
}

interface WalletsResponse {
  wallets: Wallet[];
}

type OperationsResponse = Operation[];

const fetchWallets = async (url: string): Promise<WalletsResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Не удалось загрузить данные о кошельках");
  }

  const data = (await response.json()) as WalletsResponse;

  return data;
};

const fetchOperations = async (url: string): Promise<OperationsResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Не удалось загрузить операции");
  }

  const data = (await response.json()) as OperationsResponse;

  return data;
};

const createInitialFormState = (type: TransactionType): TransactionFormState => ({
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  sourceOrCategory: type === "INCOME" ? "Зарплата" : "Еда"
});

const formatAmount = (value: number, currency: string) => {
  const formatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency
  });

  return formatter.format(value);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export default function Page(): JSX.Element {
  const router = useRouter();
  const { user } = useSession();

  const {
    data: walletsData,
    isLoading: walletsLoading,
    mutate: mutateWallets
  } = useSWR<WalletsResponse>(user ? "/api/wallets" : null, fetchWallets, {
    revalidateOnFocus: true
  });

  const {
    data: operationsData,
    isLoading: operationsLoading,
    mutate: mutateOperations
  } = useSWR<OperationsResponse>(user ? "/api/operations" : null, fetchOperations, {
    refreshInterval: 60000,
    revalidateOnFocus: true
  });

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>(() => createInitialFormState("INCOME"));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const wallets: WalletRow[] = useMemo(() => {
    return walletsData?.wallets.map<WalletRow>((wallet) => {
      const balance = typeof wallet.balance === "number" ? wallet.balance : 0;
      const category = wallet.category || "Кошелёк";

      return {
        id: wallet.id,
        name: wallet.display_name,
        currency: wallet.currency,
        balance: Number(balance.toFixed(2)),
        category
      };
    }) ?? [];
  }, [walletsData]);

  const walletsById = useMemo(() => {
    const map = new Map<string, Wallet>();

    walletsData?.wallets.forEach((wallet) => {
      map.set(wallet.id, wallet);
    });

    return map;
  }, [walletsData]);

  const walletsByName = useMemo(() => {
    const map = new Map<string, Wallet>();

    walletsData?.wallets.forEach((wallet) => {
      map.set(wallet.display_name.toLowerCase(), wallet);
    });

    return map;
  }, [walletsData]);

  const latestTransactions = useMemo(() => {
    if (!operationsData) {
      return [];
    }

    return operationsData.slice(0, 6);
  }, [operationsData]);

  const handleOpenTransaction = (walletId: string, type: TransactionType) => {
    const wallet = walletsById.get(walletId);

    if (!wallet) {
      return;
    }

    setSelectedWalletId(wallet.id);
    setSelectedWalletName(wallet.display_name);
    setTransactionType(type);
    setFormState(createInitialFormState(type));
    setFormError(null);
  };

  const handleCloseModal = () => {
    setSelectedWalletId(null);
    setSelectedWalletName(null);
    setTransactionType(null);
    setFormError(null);
  };

  const handleFieldChange = <Key extends keyof TransactionFormState>(
    key: Key,
    value: TransactionFormState[Key]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedWalletId || !transactionType) {
      return;
    }

    const numericAmount = Number.parseFloat(formState.amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("Введите корректную сумму");
      return;
    }

    if (!formState.sourceOrCategory) {
      setFormError(
        transactionType === "INCOME"
          ? "Выберите источник дохода"
          : "Выберите категорию расхода"
      );
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: selectedWalletId,
          type: transactionType,
          amount: numericAmount,
          date: formState.date || undefined,
          description: formState.description.trim() ? formState.description.trim() : undefined,
          sourceOrCategory: formState.sourceOrCategory
        })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
        const message =
          data && typeof data.error === "string"
            ? data.error
            : "Не удалось сохранить транзакцию";

        setFormError(message);
        return;
      }

      await Promise.all([mutateWallets(), mutateOperations()]);
      router.refresh();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      setFormError("Не удалось сохранить транзакцию");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthGate>
      <PageContainer>
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-6">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-semibold text-[var(--text-strong)]">Мои кошельки</h1>
                <p className="text-sm text-[var(--text-muted)]">
                  Управляйте балансом счетов и добавляйте транзакции в пару кликов.
                </p>
              </div>
            </header>
            <WalletTable
              wallets={wallets}
              loading={walletsLoading || operationsLoading}
              onAddTransaction={handleOpenTransaction}
            />
          </section>

          <section className="flex flex-col gap-4">
            <header className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                Последние транзакции
              </h2>
              <span className="text-sm text-[var(--text-muted)]">
                Обновлено автоматически каждые 60 секунд
              </span>
            </header>
            <div className="flex flex-col gap-3">
              {operationsLoading && latestTransactions.length === 0 ? (
                <div className="h-24 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-subtle)]" />
              ) : null}
              {latestTransactions.length === 0 && !operationsLoading ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-6 text-center text-sm text-[var(--text-muted)]">
                  У этого кошелька пока нет транзакций. Создайте первую, чтобы увидеть историю.
                </div>
              ) : null}
              {latestTransactions.map((transaction) => {
                const wallet = walletsByName.get(transaction.wallet.toLowerCase());
                const currency = wallet?.currency ?? transaction.currency;
                const amount = formatAmount(transaction.amount, currency);
                const isIncome = transaction.type === "income";

                return (
                  <div
                    key={transaction.id}
                    className="flex flex-col gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-primary)] px-5 py-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-[var(--text-strong)]">
                        {transaction.category}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        {transaction.wallet} • {formatDate(transaction.date)}
                      </span>
                    </div>
                    <span
                      className={`text-lg font-semibold ${isIncome ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]"}`}
                    >
                      {isIncome ? "+" : "-"}
                      {amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </PageContainer>

      <TransactionModal
        isOpen={Boolean(selectedWalletId && transactionType)}
        walletName={selectedWalletName}
        type={transactionType}
        state={formState}
        error={formError}
        isSaving={isSaving}
        onFieldChange={handleFieldChange}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </AuthGate>
  );
}
