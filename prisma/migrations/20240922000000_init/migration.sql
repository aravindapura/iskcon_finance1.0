-- Create tables
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY,
  "role" TEXT NOT NULL,
  "login" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL
);

CREATE TABLE "wallets" (
  "wallet" TEXT PRIMARY KEY,
  "display_name" TEXT NOT NULL
);

CREATE TABLE "categories" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "categories_type_name_key" UNIQUE ("type", "name")
);

CREATE TABLE "operations" (
  "id" UUID PRIMARY KEY,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(65, 30) NOT NULL,
  "currency" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "wallet" TEXT NOT NULL,
  "comment" TEXT,
  "source" TEXT,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL
);

CREATE TABLE "debts" (
  "id" UUID PRIMARY KEY,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "amount" DECIMAL(65, 30) NOT NULL,
  "currency" TEXT NOT NULL,
  "wallet" TEXT NOT NULL,
  "from_contact" TEXT,
  "to_contact" TEXT,
  "comment" TEXT,
  "registered_at" TIMESTAMPTZ(6) NOT NULL
);

CREATE TABLE "goals" (
  "id" UUID PRIMARY KEY,
  "title" TEXT NOT NULL,
  "target_amount" DECIMAL(65, 30) NOT NULL,
  "current_amount" DECIMAL(65, 30) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL,
  "currency" TEXT NOT NULL
);

CREATE TABLE "settings" (
  "id" SERIAL PRIMARY KEY,
  "base_currency" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "currency_rates" (
  "currency" TEXT PRIMARY KEY,
  "rate" DECIMAL(65, 30) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX "operations_occurred_at_idx"
  ON "operations" ("occurred_at" DESC);

CREATE INDEX "debts_registered_at_idx"
  ON "debts" ("registered_at" DESC);

CREATE UNIQUE INDEX "goals_title_key"
  ON "goals" (LOWER("title"));

CREATE UNIQUE INDEX "wallets_display_name_key"
  ON "wallets" (LOWER("display_name"));
