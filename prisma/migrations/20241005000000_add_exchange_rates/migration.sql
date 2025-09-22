CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "id" SERIAL PRIMARY KEY,
  "base_currency" TEXT NOT NULL,
  "target_currency" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "baseCurrency_targetCurrency" UNIQUE ("base_currency", "target_currency")
);
