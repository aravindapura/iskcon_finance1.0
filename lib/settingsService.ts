import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES, sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import type { Currency, Settings } from "@/lib/types";

const isValidRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const loadSettings = async (): Promise<Settings> => {
  const settingsRow = await prisma.settings.findFirst({ orderBy: { id: "desc" } });

  const baseCurrency = sanitizeCurrency(
    settingsRow?.base_currency,
    DEFAULT_SETTINGS.baseCurrency
  );

  const rateRows = await prisma.exchangeRate.findMany({
    where: { targetCurrency: baseCurrency },
  });

  const rates: Settings["rates"] = { ...DEFAULT_SETTINGS.rates };

  for (const rate of rateRows) {
    const currency = rate.baseCurrency as Currency;

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      continue;
    }

    const numericRate = Number(rate.rate);

    if (!isValidRate(numericRate)) {
      continue;
    }

    rates[currency] = numericRate;
  }

  rates[baseCurrency] = 1;

  return {
    baseCurrency,
    rates
  };
};

export const applyRatesUpdate = async (
  ratesUpdate: Partial<Record<Currency, number>>
): Promise<Settings> => {
  const settings = await loadSettings();
  const now = new Date();
  const operations: Parameters<typeof prisma.$transaction>[0] = [];

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency === settings.baseCurrency) {
      operations.push(
        prisma.exchangeRate.upsert({
          where: {
            baseCurrency_targetCurrency: {
              baseCurrency: currency,
              targetCurrency: settings.baseCurrency,
            },
          },
          update: { rate: 1, date: now },
          create: {
            baseCurrency: currency,
            targetCurrency: settings.baseCurrency,
            rate: 1,
            date: now,
          },
        })
      );
      continue;
    }

    const newRate = ratesUpdate[currency];

    if (newRate === undefined || !isValidRate(newRate)) {
      continue;
    }

    operations.push(
      prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: currency,
            targetCurrency: settings.baseCurrency,
          },
        },
        update: { rate: newRate, date: now },
        create: {
          baseCurrency: currency,
          targetCurrency: settings.baseCurrency,
          rate: newRate,
          date: now,
        },
      })
    );

    operations.push(
      prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: settings.baseCurrency,
            targetCurrency: currency,
          },
        },
        update: { rate: 1 / newRate, date: now },
        create: {
          baseCurrency: settings.baseCurrency,
          targetCurrency: currency,
          rate: 1 / newRate,
          date: now,
        },
      })
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return loadSettings();
};
