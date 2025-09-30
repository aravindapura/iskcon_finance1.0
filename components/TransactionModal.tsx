"use client";

import { useMemo } from "react";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Currency, WalletWithCurrency } from "@/lib/types";
import type { OperationType } from "./TypeTargets";
import styles from "./TransactionModal.module.css";

type FieldChangeHandler = <K extends keyof TransactionDraft>(
  field: K,
  value: TransactionDraft[K]
) => void;

export type TransactionDraft = {
  walletId: string;
  type: OperationType;
  amount: string;
  currency: Currency;
  date: string;
  category: string;
  description: string;
};

type TransactionModalProps = {
  open: boolean;
  draft: TransactionDraft | null;
  wallets: WalletWithCurrency[];
  categories: string[];
  submitting: boolean;
  error: string | null;
  onChange: FieldChangeHandler;
  onClose: () => void;
  onSubmit: () => void;
};

const TransactionModal = ({
  open,
  draft,
  wallets,
  categories,
  submitting,
  error,
  onChange,
  onClose,
  onSubmit
}: TransactionModalProps) => {
  const typeLabel = draft?.type === "INCOME" ? "Приход" : "Расход";

  const walletOptions = useMemo(() => {
    return wallets.map((wallet) => (
      <option key={wallet.id} value={wallet.id}>
        {wallet.name}
      </option>
    ));
  }, [wallets]);

  const categoryId = draft ? `category-${draft.type}` : "category";

  if (!open || !draft) {
    return null;
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>Новая операция — {typeLabel.toLowerCase()}</h2>
          <button type="button" className={styles.close} onClick={onClose}>
            ×
          </button>
        </div>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className={styles.field}>
            <span className={styles.label}>Кошелёк</span>
            <select
              className={styles.input}
              value={draft.walletId}
              onChange={(event) => onChange("walletId", event.target.value)}
            >
              {walletOptions}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Тип операции</span>
            <div className={styles.typeSwitch}>
              <button
                type="button"
                className={`${styles.typeButton} ${draft.type === "INCOME" ? styles.typeButtonActive : ""}`.trim()}
                onClick={() => onChange("type", "INCOME")}
                disabled={submitting}
              >
                Приход
              </button>
              <button
                type="button"
                className={`${styles.typeButton} ${draft.type === "EXPENSE" ? styles.typeButtonActive : ""}`.trim()}
                onClick={() => onChange("type", "EXPENSE")}
                disabled={submitting}
              >
                Расход
              </button>
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Сумма</span>
            <input
              required
              min={0.01}
              step="0.01"
              type="number"
              inputMode="decimal"
              className={styles.input}
              value={draft.amount}
              onChange={(event) => onChange("amount", event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Валюта</span>
            <select
              className={styles.input}
              value={draft.currency}
              onChange={(event) => onChange("currency", event.target.value as Currency)}
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Категория</span>
            <input
              className={styles.input}
              list={categoryId}
              value={draft.category}
              onChange={(event) => onChange("category", event.target.value)}
            />
            <datalist id={categoryId}>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Дата</span>
            <input
              type="datetime-local"
              className={styles.input}
              value={draft.date}
              onChange={(event) => onChange("date", event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Комментарий</span>
            <textarea
              rows={3}
              className={`${styles.input} ${styles.textarea}`}
              value={draft.description}
              onChange={(event) => onChange("description", event.target.value)}
            />
          </label>

          {error ? <div className={styles.error}>{error}</div> : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={onClose}
              disabled={submitting}
            >
              Отмена
            </button>
            <button type="submit" className={styles.primary} disabled={submitting}>
              {submitting ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
