import type { Debt, Goal, Operation, Rate, User } from "@/lib/types";

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
  rates: [
    { currency: "USD", usdPerUnit: 1, updatedAt: new Date(0).toISOString() },
    { currency: "RUB", usdPerUnit: 1, updatedAt: new Date(0).toISOString() },
    { currency: "EUR", usdPerUnit: 1, updatedAt: new Date(0).toISOString() },
    { currency: "GEL", usdPerUnit: 1, updatedAt: new Date(0).toISOString() }
  ],
  users: [
    { id: "1", role: "admin", login: "admin", password: "admin123" },
    { id: "2", role: "accountant", login: "buh", password: "buh123" },
    { id: "3", role: "abbot", login: "abbot", password: "abbot123" }
  ]
};
