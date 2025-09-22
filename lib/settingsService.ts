import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES, sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import type { Currency, Settings } from "@/lib/types";

const isValidRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const loadSettings = async (): Promise<Settings> => {
  const [settingsRow, exchangeRows] = await Promise.all([
    prisma.settings.findFirst({ orderBy: { id: "desc" } }),
    prisma.exchangeRate.findMany(),
  ]);

  const baseCurrency = sanitizeCurrency(
    settingsRow?.base_currency,
    DEFAULT_SETTINGS.baseCurrency,
  );

  const rateMap = new Map<string, number>();

  for (const rate of exchangeRows) {
    const base = rate.baseCurrency as Currency;
    const target = rate.targetCurrency as Currency;

    if (!SUPPORTED_CURRENCIES.includes(base) || !SUPPORTED_CURRENCIES.includes(target)) {
      continue;
    }

    const numericRate = Number(rate.rate);

    if (!isValidRate(numericRate)) {
      continue;
    }

    rateMap.set(`${base}->${target}`, numericRate);
  }

  const rates: Settings["rates"] = { ...DEFAULT_SETTINGS.rates };

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency === baseCurrency) {
      rates[currency] = 1;
      continue;
    }

    const direct = rateMap.get(`${currency}->${baseCurrency}`);

    if (isValidRate(direct)) {
      rates[currency] = direct;
      continue;
    }

    const inverse = rateMap.get(`${baseCurrency}->${currency}`);

    if (isValidRate(inverse) && inverse !== 0) {
      rates[currency] = Number((1 / inverse).toFixed(12));
      continue;
    }

    rates[currency] = 1;
  }

  return {
    baseCurrency,
    rates,
  };
};
