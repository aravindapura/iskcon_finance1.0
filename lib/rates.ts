import type { Currency } from "@/lib/types";

const sanitizeAmount = (value: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const sanitizeRate = (currency: Currency, rates: Record<string, number>): number => {
  const rawRate = rates?.[currency];

  return typeof rawRate === "number" && Number.isFinite(rawRate) && rawRate > 0
    ? rawRate
    : 1;
};

export function toUSD(
  amount: number,
  currency: "USD" | "RUB" | "GEL" | "EUR",
  rates: Record<string, number>
): number {
  const safeAmount = sanitizeAmount(amount);

  if (currency === "USD") {
    return safeAmount;
  }

  const rate = sanitizeRate(currency, rates);

  return safeAmount * rate;
}

export function fromUSD(
  usd: number,
  currency: "USD" | "RUB" | "GEL" | "EUR",
  rates: Record<string, number>
): number {
  const safeAmount = sanitizeAmount(usd);

  if (currency === "USD") {
    return safeAmount;
  }

  const rate = sanitizeRate(currency, rates);

  return safeAmount / rate;
}
