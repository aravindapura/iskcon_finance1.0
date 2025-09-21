import prisma from "@/lib/prisma";
import { DEFAULT_WALLETS, type UserRole } from "@/lib/types";

const DEFAULT_USERS: Array<{ id: string; login: string; password: string; role: UserRole }> = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    login: "buh",
    password: "buh123",
    role: "accountant"
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    login: "viewer",
    password: "viewer123",
    role: "user"
  }
];

const DEFAULT_CATEGORIES: Record<"income" | "expense", string[]> = {
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
};

const ensureUsers = async () => {
  const existing = await prisma.user.count();

  if (existing > 0) {
    return;
  }

  await prisma.user.createMany({
    data: DEFAULT_USERS,
    skipDuplicates: true
  });
};

const ensureCategoriesTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "categories" (
      "id" SERIAL PRIMARY KEY,
      "type" TEXT NOT NULL,
      "name" TEXT NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "categories_type_name_key"
    ON "categories" ("type", "name");
  `);
};

const ensureWalletsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "wallets" (
      "wallet" TEXT PRIMARY KEY,
      "display_name" TEXT NOT NULL
    );
  `);
};

const ensureCategories = async () => {
  await ensureCategoriesTable();

  await prisma.category.createMany({
    data: [
      ...DEFAULT_CATEGORIES.income.map((name) => ({ type: "income" as const, name })),
      ...DEFAULT_CATEGORIES.expense.map((name) => ({ type: "expense" as const, name }))
    ],
    skipDuplicates: true
  });
};

const normalizeWalletSlug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-");

const ensureWallets = async () => {
  await ensureWalletsTable();

  await prisma.wallet.createMany({
    data: DEFAULT_WALLETS.map((displayName) => ({
      wallet: normalizeWalletSlug(displayName),
      display_name: displayName
    })),
    skipDuplicates: true
  });
};

export const ensureDefaultUsers = ensureUsers;
export const ensureCategoryDictionary = ensureCategories;
export const ensureWalletDictionary = ensureWallets;
export const ensureDefaultDictionaries = async () => {
  await Promise.all([ensureCategories(), ensureWallets()]);
};
