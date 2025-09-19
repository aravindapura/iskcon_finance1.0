import type { OperationCategory } from "./operationCategories";

export type Operation = {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  category: OperationCategory;
  comment?: string;
  source?: string;
  date: string;
};

export type Debt = {
  id: string;
  name: string;
  direction: "outgoing" | "incoming";
  amount: number;
  status: "open" | "closed";
  date: string;
  comment?: string;
};

export type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  status: "active" | "done";
};

export type User = {
  id: string;
  role: "admin" | "accountant" | "abbot";
  login: string;
  password: string;
};
