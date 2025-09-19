import { db } from "@/lib/operationsStore";
import type { Currency, Rate } from "@/lib/types";

export const SUPPORTED_CURRENCIES: Currency[] = ["USD", "RUB", "EUR", "GEL"];
export const BASE_CURRENCY: Currency = "USD";

const FALLBACK_RATE: Rate = {
  currency: BASE_CURRENCY,
  usdPerUnit: 1,
  updatedAt: new Date(0).toISOString()
};

export const isSupportedCurrency = (currency: string): currency is Currency =>
  SUPPORTED_CURRENCIES.includes(currency as Currency);

const normalizeCurrency = (currency: string): Currency =>
  (isSupportedCurrency(currency) ? currency : BASE_CURRENCY);

export const getRate = (currency: string): Rate => {
  const normalized = normalizeCurrency(currency);
  const stored = db.rates.find((rate) => rate.currency === normalized);

  if (!stored) {
    return { ...FALLBACK_RATE, currency: normalized };
  }

  if (!Number.isFinite(stored.usdPerUnit) || stored.usdPerUnit <= 0) {
    return { ...stored, usdPerUnit: 1 };
  }

  return stored;
};

export const convertToUsd = (amount: number, currency: string): number => {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const rate = getRate(currency);
  return Number((amount * rate.usdPerUnit).toFixed(2));
};

export const convertFromUsd = (amountUsd: number, currency: string): number => {
  if (!Number.isFinite(amountUsd)) {
    return 0;
  }

  const rate = getRate(currency);

  if (rate.usdPerUnit === 0) {
    return amountUsd;
  }

  return Number((amountUsd / rate.usdPerUnit).toFixed(2));
};

export const convertBetweenCurrencies = (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number => {
  if (fromCurrency === toCurrency) {
    return Number(amount.toFixed(2));
  }

  const usdAmount = convertToUsd(amount, fromCurrency);
  return convertFromUsd(usdAmount, toCurrency);
};

export const upsertRates = (rates: Rate[]) => {
  const now = new Date().toISOString();
  for (const rate of rates) {
    const normalized = normalizeCurrency(rate.currency);
    const existing = db.rates.findIndex((item) => item.currency === normalized);
    const sanitizedUsdPerUnit = Number.isFinite(rate.usdPerUnit) && rate.usdPerUnit > 0
      ? rate.usdPerUnit
      : 1;

    const value: Rate = {
      currency: normalized,
      usdPerUnit: sanitizedUsdPerUnit,
      updatedAt: rate.updatedAt ?? now
    };

    if (existing === -1) {
      db.rates.push(value);
    } else {
      db.rates[existing] = value;
    }
  }
};

export const getRates = (): Rate[] => [...db.rates];
