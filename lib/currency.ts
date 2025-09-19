import { CURRENCIES, type Currency, type Settings } from "@/lib/types";

export const SUPPORTED_CURRENCIES: readonly Currency[] = CURRENCIES;

export const DEFAULT_SETTINGS: Settings = {
  baseCurrency: "USD",
  rates: {
    USD: 1,
    GEL: 1,
    RUB: 1,
    EUR: 1
  }
};

export const isSupportedCurrency = (value: unknown): value is Currency =>
  typeof value === "string" && SUPPORTED_CURRENCIES.includes(value as Currency);

export const sanitizeCurrency = (value: unknown, fallback: Currency = "USD"): Currency =>
  isSupportedCurrency(value) ? value : fallback;

const getRate = (currency: Currency, settings: Settings) => {
  const rate = settings.rates[currency];

  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : 1;
};

export const convertToBase = (amount: number, currency: Currency, settings: Settings) => {
  const rate = getRate(currency, settings);

  return amount * rate;
};

export const convertFromBase = (
  amount: number,
  currency: Currency,
  settings: Settings
) => {
  const rate = getRate(currency, settings);

  return rate === 0 ? amount : amount / rate;
};
