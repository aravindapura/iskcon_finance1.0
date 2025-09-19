export type Currency = "USD" | "RUB" | "EUR" | "GEL";

export type Rate = {
  currency: Currency;
  usdPerUnit: number;
  updatedAt: string;
};

export type Operation = {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: Currency;
  amountUsd: number;
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
  amountUsd: number;
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
  targetCurrency: Currency;
  targetAmountUsd: number;
  currentAmount: number;
  currentAmountUsd: number;
  status: "active" | "done";
};

export type User = {
  id: string;
  role: "admin" | "accountant" | "abbot";
  login: string;
  password: string;
};
