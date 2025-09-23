// trigger redeploy
import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES, sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import type { Currency, Settings } from "@/lib/types";

const isValidRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const loadSettings = async (): Promise<Settings> => {
  const [settingsRow, rateRows] = await Promise.all([
    prisma.settings.findFirst({ orderBy: { id: "desc" } }),
    prisma.currencyRate.findMany()
  ]);

  const baseCurrency = sanitizeCurrency(
    settingsRow?.base_currency,
    DEFAULT_SETTINGS.baseCurrency
  );

  const rates: Settings["rates"] = { ...DEFAULT_SETTINGS.rates };

  for (const rate of rateRows) {
    const currency = rate.currency as Currency;

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      continue;
    }

    const numericRate = Number(rate.rate);

    if (!isValidRate(numericRate)) {
      continue;
    }

    rates[currency] = numericRate;
  }

  if (baseCurrency === "USD") {
    rates[baseCurrency] = 1;
  } else if (!isValidRate(rates[baseCurrency])) {
    rates[baseCurrency] = 1;
  }

  return {
    baseCurrency,
    rates
  };
};

export const applyRatesUpdate = async (
  ratesUpdate: Partial<Record<Currency, number>>
): Promise<Settings> => {
  const settings = await loadSettings();
  const operations: Promise<unknown>[] = [];

  for (const currency of SUPPORTED_CURRENCIES) {
    const newRate = ratesUpdate[currency];

    if (currency === settings.baseCurrency) {
      const rateToSave =
        currency === "USD"
          ? 1
          : newRate;

      if (rateToSave === undefined) {
        continue;
      }

      operations.push(
        prisma.currencyRate.upsert({
          where: { currency },
          update: { rate: rateToSave },
          create: { currency, rate: rateToSave }
        })
      );
      continue;
    }

    if (newRate === undefined) {
      continue;
    }

    operations.push(
      prisma.currencyRate.upsert({
        where: { currency },
        update: { rate: newRate },
        create: { currency, rate: newRate }
      })
    );
  }

  await Promise.all(operations);

  return loadSettings();
};
