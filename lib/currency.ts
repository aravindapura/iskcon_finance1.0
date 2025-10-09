import { fromUSD, toUSD } from "@/lib/rates";
import { DEFAULT_CURRENCIES, type Currency, type Settings } from "@/lib/types";

export const SUPPORTED_CURRENCIES: readonly Currency[] = [...DEFAULT_CURRENCIES];

export const DEFAULT_SETTINGS: Settings = {
  baseCurrency: "USD",
  rates: {
    USD: 1,
    GEL: 1,
    RUB: 1,
    EUR: 1
  },
  availableCurrencies: [...SUPPORTED_CURRENCIES]
};

export const isSupportedCurrency = (value: unknown): value is Currency =>
  typeof value === "string" && value.trim().length > 0;

export const sanitizeCurrency = (
  value: unknown,
  fallback: Currency = "USD"
): Currency => {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return fallback;
};

export const convertToBase = (amount: number, currency: Currency, settings: Settings) => {
  const amountInUSD = toUSD(amount, currency, settings.rates);

  if (settings.baseCurrency === "USD") {
    return amountInUSD;
  }

  return fromUSD(amountInUSD, settings.baseCurrency, settings.rates);
};

export const convertFromBase = (
  amount: number,
  currency: Currency,
  settings: Settings
) => {
  const amountInUSD =
    settings.baseCurrency === "USD"
      ? amount
      : toUSD(amount, settings.baseCurrency, settings.rates);

  return fromUSD(amountInUSD, currency, settings.rates);
};
