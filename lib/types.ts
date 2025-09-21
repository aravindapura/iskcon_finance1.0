export const CURRENCIES = ["USD", "RUB", "GEL", "EUR"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_WALLETS = [
  "крипта",
  "русская карта",
  "грузинская карта",
  "наличные"
] as const;

export type Wallet = string;

export type Operation = {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: Currency;
  category: string;
  wallet: Wallet;
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
  wallet: Wallet;
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

export type UserRole = "user" | "accountant";

export type User = {
  id: string;
  role: UserRole;
  login: string;
  password: string;
};

export type SessionUser = Pick<User, "id" | "login" | "role">;

export type CategoryStore = {
  income: string[];
  expense: string[];
};

export type Settings = {
  baseCurrency: Currency;
  rates: Record<Currency, number>;
};
