-- Create new exchange rates table
CREATE TABLE "exchange_rates" (
  "id" SERIAL PRIMARY KEY,
  "base_currency" TEXT NOT NULL,
  "target_currency" TEXT NOT NULL,
  "rate" DECIMAL(65, 30) NOT NULL,
  "date" TIMESTAMPTZ(6) NOT NULL
);

CREATE UNIQUE INDEX "exchange_rates_base_currency_target_currency_key"
  ON "exchange_rates" ("base_currency", "target_currency");

-- Remove legacy currency rates table
DROP TABLE IF EXISTS "currency_rates";
