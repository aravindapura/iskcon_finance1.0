export const CURRENCIES = ["USD", "GEL", "RUB", "EUR"] as const;

export type Currency = (typeof CURRENCIES)[number];

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
  status: "active" | "done";
  currency: Currency;
};

export type User = {
  id: string;
  role: "admin" | "accountant" | "abbot";
  login: string;
  password: string;
};

export type Settings = {
  baseCurrency: Currency;
  rates: Record<Currency, number>;
};
