export type Operation = {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  category: string;
  comment?: string;
  source?: string;
  date: string;
};

export type Debt = {
  id: string;
  amount: number;
  status: "open" | "closed";
  date: string;
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
