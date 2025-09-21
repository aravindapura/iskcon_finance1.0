import { convertToBase, DEFAULT_SETTINGS } from "@/lib/currency";
import type {
  CategoryStore,
  Debt,
  Goal,
  Operation,
  Settings,
  User
} from "@/lib/types";

export const db: {
  operations: Operation[];
  debts: Debt[];
  goals: Goal[];
  users: User[];
  categories: CategoryStore;
  settings: Settings;
} = {
  operations: [],
  debts: [],
  goals: [],
  users: [
    { id: "1", role: "accountant", login: "buh", password: "buh123" },
    { id: "2", role: "user", login: "viewer", password: "viewer123" }
  ],
  categories: {
    income: [
      "йога",
      "ящик для пожертвований",
      "личное пожертвование",
      "харинама",
      "продажа книг",
      "прочее"
    ],
    expense: [
      "аренда",
      "коммунальные",
      "газ",
      "прасад",
      "быт",
      "цветы",
      "развитие",
      "прочее"
    ]
  },
  settings: { ...DEFAULT_SETTINGS }
};

const normalizeCategory = (category: string) => category.trim().toLowerCase();

export const recalculateGoalProgress = () => {
  for (const goal of db.goals) {
    goal.currentAmount = 0;
  }

  for (const operation of db.operations) {
    if (operation.type !== "expense") {
      continue;
    }

    const matchedGoal = db.goals.find(
      (goal) => normalizeCategory(goal.title) === normalizeCategory(operation.category)
    );

    if (!matchedGoal) {
      continue;
    }

    const amountInBase = convertToBase(operation.amount, operation.currency, db.settings);
    matchedGoal.currentAmount += amountInBase;
  }

  for (const goal of db.goals) {
    goal.status = goal.currentAmount >= goal.targetAmount ? "done" : "active";
  }
};
