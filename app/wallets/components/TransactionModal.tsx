"use client";

import { useEffect } from "react";

type TransactionType = "INCOME" | "EXPENSE";

type TransactionFormState = {
  amount: string;
  category: string;
  description: string;
  source: string;
};

type TransactionModalProps = {
  isOpen: boolean;
  type: TransactionType | null;
  walletName?: string;
  sources: string[];
  formData: TransactionFormState;
  onChange: <Field extends keyof TransactionFormState>(field: Field, value: TransactionFormState[Field]) => void;
  onClose: () => void;
  onSubmit: () => void;
  error?: string | null;
  submitting?: boolean;
};

const TransactionModal = ({
  isOpen,
  type,
  walletName,
  sources,
  formData,
  onChange,
  onClose,
  onSubmit,
  error,
  submitting
}: TransactionModalProps) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !type) {
    return null;
  }

  const modalTitle = type === "INCOME" ? "Добавить приход" : "Добавить расход";
  const submitLabel = submitting ? "Сохраняем..." : "Сохранить";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Закрыть модальное окно"
        >
          ×
        </button>

        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{modalTitle}</h2>
          {walletName ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Кошелёк: {walletName}</p>
          ) : null}
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200">
            <span>Сумма</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={(event) => onChange("amount", event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="0.00"
              required
            />
          </label>

          {type === "EXPENSE" ? (
            <label className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200">
              <span>Категория расхода</span>
              <input
                type="text"
                value={formData.category}
                onChange={(event) => onChange("category", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Например, продукты"
                required
              />
            </label>
          ) : (
            <label className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200">
              <span>Источник дохода</span>
              <select
                value={formData.source}
                onChange={(event) => onChange("source", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              >
                <option value="" disabled>
                  Выберите источник
                </option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200">
            <span>Описание (необязательно)</span>
            <textarea
              value={formData.description}
              onChange={(event) => onChange("description", event.target.value)}
              className="h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder={type === "INCOME" ? "Комментарий к приходу" : "Комментарий к расходу"}
            />
          </label>

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export type { TransactionFormState, TransactionType };
export default TransactionModal;
