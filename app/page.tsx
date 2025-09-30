"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import useSWR from "swr";
import AuthGate from "@/components/AuthGate";
import PageContainer from "@/components/PageContainer";
import { useSession } from "@/components/SessionProvider";
import {
  convertFromBase,
  convertToBase,
  DEFAULT_SETTINGS,
  SUPPORTED_CURRENCIES
} from "@/lib/currency";
import {
  type Currency,
  type Operation,
  type Settings,
  type WalletWithCurrency
} from "@/lib/types";
import { fetcher, type FetcherError } from "@/lib/fetcher";
import styles from "./page.module.css";

type CategoriesResponse = {
  income: string[];
  expense: string[];
};

type WalletsResponse = {
  wallets: WalletWithCurrency[];
};

type DragState = {
  wallet: WalletWithCurrency | null;
  pointer: { x: number; y: number } | null;
  offset: { x: number; y: number } | null;
  target: Operation["type"] | null;
};

const getWalletIcon = (walletName: string) => {
  const normalized = walletName.toLowerCase();

  if (/(карта|card)/.test(normalized)) {
    return "💳";
  }

  if (/(банк|account|сч[её]т|bank)/.test(normalized)) {
    return "🏦";
  }

  if (/(нал|cash)/.test(normalized)) {
    return "💵";
  }

  if (/(crypto|крипт)/.test(normalized)) {
    return "🪙";
  }

  return "👛";
};

const convertBetweenCurrencies = (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  settings: Settings
) => {
  const baseAmount = convertToBase(amount, fromCurrency, settings);
  return convertFromBase(baseAmount, toCurrency, settings);
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

const createInitialDragState = (): DragState => ({
  wallet: null,
  pointer: null,
  offset: null,
  target: null
});

const Dashboard = () => {
  const { user, refresh } = useSession();
  const canManage = Boolean(user);

  const [operations, setOperations] = useState<Operation[]>([]);
  const [wallets, setWallets] = useState<WalletWithCurrency[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletWithCurrency | null>(
    null
  );
  const [flowType, setFlowType] = useState<Operation["type"]>("expense");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(DEFAULT_SETTINGS.baseCurrency);
  const [category, setCategory] = useState("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragState, setDragState] = useState<DragState>(() => createInitialDragState());

  const incomeZoneRef = useRef<HTMLDivElement | null>(null);
  const expenseZoneRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const {
    data: operationsData,
    error: operationsError,
    isLoading: operationsLoading,
    mutate: mutateOperations
  } = useSWR<Operation[]>(user ? "/api/operations" : null, fetcher, {
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
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading
  } = useSWR<CategoriesResponse>(user ? "/api/categories" : null, fetcher, {
    revalidateOnFocus: true
  });

  const {
    data: walletsData,
    error: walletsError,
    isLoading: walletsLoading
  } = useSWR<WalletsResponse>(user ? "/api/wallets" : null, fetcher, {
    revalidateOnFocus: true
  });

  useEffect(() => {
    if (operationsData) {
      setOperations(operationsData);
    }
  }, [operationsData]);

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  useEffect(() => {
    if (walletsData?.wallets) {
      setWallets(walletsData.wallets);
    }
  }, [walletsData]);

  useEffect(() => {
    const currentError =
      operationsError || settingsError || categoriesError || walletsError;

    if (!currentError) {
      setError(null);
      return;
    }

    if ((currentError as FetcherError).status === 401) {
      setError("Сессия истекла, войдите заново.");
      void refresh();
      return;
    }

    setError("Не удалось загрузить данные. Попробуйте обновить страницу.");
  }, [operationsError, settingsError, categoriesError, walletsError, refresh]);

  const detectDropTarget = useCallback(
    (x: number, y: number): Operation["type"] | null => {
      const expenseRect = expenseZoneRef.current?.getBoundingClientRect();
      if (
        expenseRect &&
        x >= expenseRect.left &&
        x <= expenseRect.right &&
        y >= expenseRect.top &&
        y <= expenseRect.bottom
      ) {
        return "expense";
      }

      const incomeRect = incomeZoneRef.current?.getBoundingClientRect();
      if (
        incomeRect &&
        x >= incomeRect.left &&
        x <= incomeRect.right &&
        y >= incomeRect.top &&
        y <= incomeRect.bottom
      ) {
        return "income";
      }

      return null;
    },
    []
  );

  const openOperationModal = useCallback(
    (wallet: WalletWithCurrency, type: Operation["type"]) => {
      if (!canManage) {
        return;
      }

      const fallbackCurrency = wallet.currency ?? DEFAULT_SETTINGS.baseCurrency;
      const categories =
        type === "income"
          ? categoriesData?.income ?? []
          : categoriesData?.expense ?? [];

      setSelectedWallet(wallet);
      setFlowType(type);
      setIsModalOpen(true);
      setAmount("");
      setCurrency(fallbackCurrency);
      setCategory(categories[0] ?? "");
      setComment("");
      setFormError(null);
    },
    [canManage, categoriesData]
  );

  const handleWalletPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, wallet: WalletWithCurrency) => {
      if (!canManage) {
        return;
      }

      event.preventDefault();

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (error: unknown) {
        // ignore pointer capture errors (e.g., unsupported browsers)
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const offset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };

      pointerIdRef.current = event.pointerId;

      const pointer = { x: event.clientX, y: event.clientY };
      const target = detectDropTarget(pointer.x, pointer.y);

      setDragState({
        wallet,
        offset,
        pointer,
        target
      });
    },
    [canManage, detectDropTarget]
  );

  const handleWalletPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      event.preventDefault();

      const pointer = { x: event.clientX, y: event.clientY };
      const target = detectDropTarget(pointer.x, pointer.y);

      setDragState((prev) => {
        if (!prev.wallet) {
          return prev;
        }

        return {
          ...prev,
          pointer,
          target
        };
      });
    },
    [detectDropTarget]
  );

  const finishDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      shouldOpenModal: boolean
    ) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      pointerIdRef.current = null;

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch (error: unknown) {
        // ignore pointer capture errors (e.g., unsupported browsers)
      }

      const pointer = { x: event.clientX, y: event.clientY };
      const pointerTarget = shouldOpenModal
        ? detectDropTarget(pointer.x, pointer.y)
        : null;

      let dropTarget: Operation["type"] | null = null;
      let dropWallet: WalletWithCurrency | null = null;

      setDragState((prev) => {
        if (prev.wallet && shouldOpenModal) {
          dropTarget = pointerTarget ?? prev.target;
          dropWallet = prev.wallet;
        }

        return createInitialDragState();
      });

      if (dropTarget && dropWallet) {
        openOperationModal(dropWallet, dropTarget);
      }
    },
    [detectDropTarget, openOperationModal]
  );

  const handleWalletPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finishDrag(event, true);
    },
    [finishDrag]
  );

  const handleWalletPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finishDrag(event, false);
    },
    [finishDrag]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedWallet) {
        return;
      }

      const normalizedAmount = amount.replace(",", ".").trim();
      const numericAmount = Number.parseFloat(normalizedAmount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        setFormError("Введите корректную сумму больше нуля");
        return;
      }

      if (!category.trim()) {
        setFormError("Выберите категорию");
        return;
      }

      setSubmitting(true);
      setFormError(null);

      try {
        const response = await fetch("/api/operations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: flowType,
            amount: numericAmount,
            currency,
            category: category.trim(),
            wallet: selectedWallet.name,
            comment: comment.trim() ? comment.trim() : null,
            source: null
          })
        });

        if (response.status === 401) {
          setFormError("Сессия истекла, войдите заново.");
          await refresh();
          return;
        }

        if (response.status === 403) {
          setFormError("Недостаточно прав для добавления операции");
          return;
        }

        if (!response.ok) {
          throw new Error("Не удалось сохранить операцию");
        }

        const updatedOperations = await mutateOperations();
        if (updatedOperations) {
          setOperations(updatedOperations);
        }

        closeModal();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Произошла ошибка");
      } finally {
        setSubmitting(false);
      }
    },
    [
      amount,
      category,
      closeModal,
      comment,
      currency,
      flowType,
      mutateOperations,
      refresh,
      selectedWallet
    ]
  );

  const activeSettings = settings ?? DEFAULT_SETTINGS;

  const walletSummaries = useMemo(() => {
    return wallets.map((wallet) => {
      const relatedOperations = operations.filter(
        (operation) => operation.wallet.toLowerCase() === wallet.name.toLowerCase()
      );

      const balance = relatedOperations.reduce((acc, operation) => {
        const operationAmount =
          operation.currency === wallet.currency
            ? operation.amount
            : convertBetweenCurrencies(
                operation.amount,
                operation.currency,
                wallet.currency,
                activeSettings
              );

        if (operation.type === "income") {
          return acc + operationAmount;
        }

        return acc - operationAmount;
      }, 0);

      return {
        wallet,
        balance
      };
    });
  }, [wallets, operations, activeSettings]);

  const totalInBase = useMemo(() => {
    return walletSummaries.reduce((acc, { balance, wallet }) => {
      const baseValue = convertToBase(balance, wallet.currency, activeSettings);
      return acc + baseValue;
    }, 0);
  }, [walletSummaries, activeSettings]);

  const initialLoading =
    operationsLoading || settingsLoading || categoriesLoading || walletsLoading;

  const activeCategories = flowType === "income"
    ? categoriesData?.income ?? []
    : categoriesData?.expense ?? [];

  return (
    <AuthGate>
      <PageContainer activeTab="home">
        <div className={styles.screen}>
          <div className={styles.heading}>
            <div>
              <h1 className={styles.title}>Финансовый дашборд</h1>
              <p className={styles.subtitle}>
                Перетяните кошелёк в зоны «Приход» или «Расход», чтобы создать операцию
              </p>
            </div>
            <div className={styles.total}>
              <span className={styles.totalLabel}>Итого</span>
              <span className={styles.totalValue}>
                {formatAmount(totalInBase)} {activeSettings.baseCurrency}
              </span>
            </div>
          </div>

          {error ? <div className={styles.errorBanner}>{error}</div> : null}

          {initialLoading ? (
            <div className={styles.loading}>Загружаем данные...</div>
          ) : null}

          {!initialLoading && walletSummaries.length === 0 ? (
            <div className={styles.emptyState}>
              Пока нет кошельков. Добавьте их в настройках, чтобы начать работу.
            </div>
          ) : null}

          <div className={styles.board}>
            <div className={styles.walletGrid}>
              {walletSummaries.map(({ wallet, balance }) => {
                const isDragging = dragState.wallet?.id === wallet.id;

                return (
                  <div
                    key={wallet.id}
                    className={
                      isDragging
                        ? `${styles.walletCard} ${styles.walletCardDragging}`
                        : styles.walletCard
                    }
                    onPointerDown={(event) => handleWalletPointerDown(event, wallet)}
                    onPointerMove={handleWalletPointerMove}
                    onPointerUp={handleWalletPointerUp}
                    onPointerCancel={handleWalletPointerCancel}
                  >
                    <span className={styles.walletIcon}>{getWalletIcon(wallet.name)}</span>
                    <div className={styles.walletBalance}>{formatAmount(balance)}</div>
                    <div className={styles.walletCurrency}>{wallet.currency}</div>
                    <div className={styles.walletName}>{wallet.name}</div>
                  </div>
                );
              })}
            </div>

            <div className={styles.dropZones}>
              <div
                ref={expenseZoneRef}
                className={[
                  styles.dropZone,
                  styles.dropZoneExpense,
                  dragState.target === "expense" && dragState.wallet
                    ? styles.dropZoneActive
                    : "",
                  dragState.target === "expense" && dragState.wallet
                    ? styles.dropZoneExpenseActive
                    : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={styles.dropZoneTitle}>Расход</span>
                <span className={styles.dropZoneHint}>
                  Перетащите кошелёк сюда, чтобы списать средства
                </span>
              </div>

              <div
                ref={incomeZoneRef}
                className={[
                  styles.dropZone,
                  styles.dropZoneIncome,
                  dragState.target === "income" && dragState.wallet
                    ? styles.dropZoneActive
                    : "",
                  dragState.target === "income" && dragState.wallet
                    ? styles.dropZoneIncomeActive
                    : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={styles.dropZoneTitle}>Приход</span>
                <span className={styles.dropZoneHint}>
                  Перетащите кошелёк сюда, чтобы пополнить баланс
                </span>
              </div>
            </div>
          </div>

          {dragState.wallet && dragState.pointer && dragState.offset ? (
            <div
              className={styles.dragPreview}
              style={{
                transform: `translate3d(${dragState.pointer.x - dragState.offset.x}px, ${dragState.pointer.y - dragState.offset.y}px, 0)`
              }}
            >
              <div className={styles.dragPreviewContent}>
                <span className={styles.walletIcon}>{getWalletIcon(dragState.wallet.name)}</span>
                <div className={styles.walletName}>{dragState.wallet.name}</div>
                <div className={styles.dragPreviewHint}>Перетащите в нужную зону</div>
              </div>
            </div>
          ) : null}
        </div>

        {isModalOpen && selectedWallet ? (
          <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {flowType === "income" ? "Новый приход" : "Новый расход"}
                </h2>
                <p className={styles.modalSubtitle}>
                  {selectedWallet.name} • {selectedWallet.currency}
                </p>
              </div>

              <form className={styles.modalForm} onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="amount">
                    Сумма
                  </label>
                  <input
                    id="amount"
                    className={styles.textInput}
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="currency">
                      Валюта
                    </label>
                    <select
                      id="currency"
                      className={styles.select}
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value as Currency)}
                    >
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="category">
                      Категория
                    </label>
                    <select
                      id="category"
                      className={styles.select}
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      required
                      disabled={activeCategories.length === 0}
                    >
                      {activeCategories.length === 0 ? (
                        <option value="" disabled>
                          Нет доступных категорий
                        </option>
                      ) : null}
                      {activeCategories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="comment">
                    Комментарий
                  </label>
                  <textarea
                    id="comment"
                    className={styles.textarea}
                    placeholder="По желанию"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </div>

                {formError ? (
                  <div className={styles.formError}>{formError}</div>
                ) : null}

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={submitting || !amount.trim() || !category.trim()}
                  >
                    {submitting ? "Сохраняем..." : "Сохранить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AuthGate>
  );
};

export default Dashboard;
