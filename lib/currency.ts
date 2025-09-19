export const SUPPORTED_CURRENCIES = ["USD", "RUB", "EUR", "GEL"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const BASE_CURRENCY: CurrencyCode = "USD";

export const isCurrencyCode = (value: string): value is CurrencyCode =>
  SUPPORTED_CURRENCIES.includes(value as CurrencyCode);
