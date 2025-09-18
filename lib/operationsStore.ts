import type { Debt, Goal, Operation, User } from "./types";

type Database = {
  operations: Operation[];
  debts: Debt[];
  goals: Goal[];
  users: User[];
};

export const db: Database = {
  operations: [],
  debts: [],
  goals: [],
  users: [
    { id: "1", role: "admin", login: "admin", password: "admin123" },
    { id: "2", role: "accountant", login: "buh", password: "buh123" },
    { id: "3", role: "abbot", login: "abbot", password: "abbot123" }
  ]
};
