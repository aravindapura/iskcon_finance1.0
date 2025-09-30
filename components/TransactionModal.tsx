"use client";

import { useEffect, type FormEvent } from "react";

import TransactionForm, {
  type TransactionFormState,
  type TransactionType
} from "@/components/TransactionForm";

type TransactionModalProps = {
  isOpen: boolean;
  walletName: string | null;
  type: TransactionType | null;
  state: TransactionFormState;
  error?: string | null;
  isSaving: boolean;
  onFieldChange: <Key extends keyof TransactionFormState>(key: Key, value: TransactionFormState[Key]) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const TransactionModal = ({
  isOpen,
  walletName,
  type,
  state,
  error,
  isSaving,
  onFieldChange,
  onClose,
  onSubmit
}: TransactionModalProps) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const { style } = document.body;
    const originalOverflow = style.overflow;
    style.overflow = "hidden";

    return () => {
      style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !walletName || !type) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-10">
      <div className="relative w-full max-w-xl rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-primary)] p-6 shadow-[var(--shadow-strong)]">
        <button
          type="button"
          aria-label="Закрыть"
          onClick={onClose}
          className="absolute right-4 top-4 h-10 w-10 rounded-full border border-[var(--border-strong)] bg-transparent text-lg font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
        >
          ×
        </button>
        <TransactionForm
          walletName={walletName}
          type={type}
          state={state}
          error={error}
          isSaving={isSaving}
          onFieldChange={onFieldChange}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};

export default TransactionModal;
