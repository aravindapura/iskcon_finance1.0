export type OperationKind = "income" | "expense";

export const INCOME_CATEGORIES = [
  "йога",
  "ящик для пожертвований",
  "личное пожертвование",
  "харинама",
  "продажа книг",
  "прочее"
] as const;

export const EXPENSE_CATEGORIES = [
  "аренда",
  "коммунальные",
  "газ",
  "прасад",
  "быт",
  "цветы",
  "развитие",
  "прочее"
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type OperationCategory = IncomeCategory | ExpenseCategory;

const CATEGORY_MAP: Record<OperationKind, readonly OperationCategory[]> = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES
};

export const getCategoryOptions = (
  type: OperationKind
): readonly OperationCategory[] => CATEGORY_MAP[type];

export const isValidCategory = (
  type: OperationKind,
  category: string | null | undefined
): category is OperationCategory => {
  if (!category) {
    return false;
  }

  const options = getCategoryOptions(type);
  return options.some((option) => option === category);
};

export const getDefaultCategory = (type: OperationKind): OperationCategory => {
  const options = getCategoryOptions(type);

  if (options.length === 0) {
    throw new Error(`Категории для типа "${type}" не настроены`);
  }

  return options[0];
};
