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

const ensureUsersTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" UUID PRIMARY KEY,
      "role" TEXT NOT NULL,
      "login" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL
    );
  `);
};

const ensureOperationsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "operations" (
      "id" UUID PRIMARY KEY,
      "type" TEXT NOT NULL,
      "amount" DECIMAL(65, 30) NOT NULL,
      "currency" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "wallet" TEXT NOT NULL,
      "comment" TEXT,
      "source" TEXT,
      "occurred_at" TIMESTAMPTZ NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "operations_occurred_at_idx"
    ON "operations" ("occurred_at" DESC);
  `);
};

const ensureDebtsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "debts" (
      "id" UUID PRIMARY KEY,
      "type" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "amount" DECIMAL(65, 30) NOT NULL,
      "currency" TEXT NOT NULL,
      "wallet" TEXT NOT NULL,
      "from_contact" TEXT,
      "to_contact" TEXT,
      "comment" TEXT,
      "registered_at" TIMESTAMPTZ NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "debts_registered_at_idx"
    ON "debts" ("registered_at" DESC);
  `);
};

const ensureGoalsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "goals" (
      "id" UUID PRIMARY KEY,
      "title" TEXT NOT NULL,
      "target_amount" DECIMAL(65, 30) NOT NULL,
      "current_amount" DECIMAL(65, 30) NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL,
      "currency" TEXT NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "goals_title_key"
    ON "goals" (LOWER("title"));
  `);
};

const ensureSettingsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "settings" (
      "id" SERIAL PRIMARY KEY,
      "base_currency" TEXT NOT NULL,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const ensureCurrencyRatesTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "currency_rates" (
      "currency" TEXT PRIMARY KEY,
      "rate" DECIMAL(65, 30) NOT NULL,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const ensureUsers = async () => {
  await ensureUsersTable();
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

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "wallets_display_name_key"
    ON "wallets" (LOWER("display_name"));
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

export const ensureOperationsSchema = ensureOperationsTable;
export const ensureDebtsSchema = ensureDebtsTable;
export const ensureGoalsSchema = ensureGoalsTable;
export const ensureSettingsSchema = async () => {
  await Promise.all([ensureSettingsTable(), ensureCurrencyRatesTable()]);
};

export const ensureCoreTables = async () => {
  await Promise.all([
    ensureUsersTable(),
    ensureOperationsTable(),
    ensureDebtsTable(),
    ensureGoalsTable(),
    ensureSettingsTable(),
    ensureCurrencyRatesTable(),
    ensureCategoriesTable(),
    ensureWalletsTable()
  ]);
};
