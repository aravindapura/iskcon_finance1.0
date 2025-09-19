import { SUPPORTED_CURRENCIES, type Debt, type Goal, type Operation, type Rate, type User } from "@/lib/types";

const createInitialRates = (): Rate[] =>
  SUPPORTED_CURRENCIES.map((currency) => ({
    currency,
    rate: 1,
    updatedAt: new Date().toISOString()
  }));

export const db: {
  operations: Operation[];
  debts: Debt[];
  goals: Goal[];
  rates: Rate[];
  users: User[];
} = {
  operations: [],
  debts: [],
  goals: [],
  rates: createInitialRates(),
  users: [
    { id: "1", role: "admin", login: "admin", password: "admin123" },
    { id: "2", role: "accountant", login: "buh", password: "buh123" },
    { id: "3", role: "abbot", login: "abbot", password: "abbot123" }
  ]
};
