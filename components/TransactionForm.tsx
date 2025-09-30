"use client";

import type { FormEvent } from "react";

export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionFormState = {
  amount: string;
  date: string;
  description: string;
  sourceOrCategory: string;
};

type TransactionFormProps = {
  walletName: string;
  type: TransactionType;
  state: TransactionFormState;
  error?: string | null;
  isSaving: boolean;
  onFieldChange: <Key extends keyof TransactionFormState>(key: Key, value: TransactionFormState[Key]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const INCOME_OPTIONS = [
  { value: "зарплата", label: "Зарплата" },
  { value: "пожертвование", label: "Пожертвование" },
  { value: "другое", label: "Другое" }
];

const EXPENSE_OPTIONS = [
  { value: "еда", label: "Еда" },
  { value: "транспорт", label: "Транспорт" },
  { value: "другое", label: "Другое" }
];

const TransactionForm = ({
  walletName,
  type,
  state,
  error,
  isSaving,
  onFieldChange,
  onSubmit,
  onCancel
}: TransactionFormProps) => {
  const headline = type === "INCOME" ? "Добавление дохода" : "Добавление расхода";

  const options = type === "INCOME" ? INCOME_OPTIONS : EXPENSE_OPTIONS;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-left">
        <span className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">{walletName}</span>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{headline}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Сумма</span>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={state.amount}
            onChange={(event) => onFieldChange("amount", event.target.value)}
            className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 py-3 text-base font-semibold text-[var(--text-strong)] shadow-[var(--shadow-soft)] focus:border-[var(--accent-primary)] focus:outline-none"
            placeholder="0.00"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Дата</span>
          <input
            type="date"
            value={state.date}
            onChange={(event) => onFieldChange("date", event.target.value)}
            className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 py-3 text-base text-[var(--text-strong)] shadow-[var(--shadow-soft)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {type === "INCOME" ? "Источник дохода" : "Категория расхода"}
        </span>
        <select
          required
          value={state.sourceOrCategory}
          onChange={(event) => onFieldChange("sourceOrCategory", event.target.value)}
          className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 py-3 text-base text-[var(--text-strong)] shadow-[var(--shadow-soft)] focus:border-[var(--accent-primary)] focus:outline-none"
        >
          <option value="" disabled>
            Выберите вариант
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Описание (необязательно)</span>
        <textarea
          rows={3}
          value={state.description}
          onChange={(event) => onFieldChange("description", event.target.value)}
          placeholder="Комментарий к транзакции"
          className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 py-3 text-base text-[var(--text-secondary)] shadow-[var(--shadow-soft)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
      </label>

      {error ? (
        <div className="rounded-2xl border border-[var(--accent-danger)] bg-[var(--surface-danger)] px-4 py-3 text-sm font-medium text-[var(--accent-danger-strong)]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-[var(--border-strong)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-button-outline)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-2xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-button)] transition hover:bg-[var(--accent-primary-hover)] disabled:opacity-70"
        >
          {isSaving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
