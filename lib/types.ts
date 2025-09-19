export const SUPPORTED_CURRENCIES = ["USD", "RUB", "EUR", "GEL"] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type Operation = {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: Currency;
  category: string;
  comment?: string;
  source?: string;
  date: string;
};

export type Debt = {
  id: string;
  type: "borrowed" | "lent";
  amount: number;
  currency: Currency;
  status: "open" | "closed";
  date: string;
  from?: string;
  to?: string;
  comment?: string;
};

export type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  status: "active" | "done";
};

export type Rate = {
  currency: Currency;
  rate: number;
  updatedAt: string;
};

export type User = {
  id: string;
  role: "admin" | "accountant" | "abbot";
  login: string;
  password: string;
};
