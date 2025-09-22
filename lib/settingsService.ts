import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES, sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Currency, Settings } from "@/lib/types";

const isValidRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const RATE_INVERSION_THRESHOLD = 10;

const normalizeRateValue = (
  rate: number,
  currency: Currency,
  baseCurrency: Currency
) => {
  if (!isValidRate(rate) || currency === baseCurrency) {
    return rate;
  }

  if (baseCurrency === "USD" && rate > RATE_INVERSION_THRESHOLD) {
    return 1 / rate;
  }

  return rate;
};

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
  const corrections: Prisma.PrismaPromise<any>[] = [];
  let correctionTimestamp: Date | null = null;

  for (const rate of rateRows) {
    const currency = rate.baseCurrency as Currency;

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      continue;
    }

    const numericRate = Number(rate.rate);

    if (!isValidRate(numericRate)) {
      continue;
    }

    const normalizedRate = normalizeRateValue(numericRate, currency, baseCurrency);

    rates[currency] = normalizedRate;

    if (Math.abs(normalizedRate - numericRate) > Number.EPSILON) {
      if (!correctionTimestamp) {
        correctionTimestamp = new Date();
      }

      corrections.push(
        prisma.exchangeRate.update({
          where: {
            baseCurrency_targetCurrency: {
              baseCurrency: currency,
              targetCurrency: baseCurrency,
            },
          },
          data: { rate: normalizedRate, date: correctionTimestamp },
        })
      );

      corrections.push(
        prisma.exchangeRate.upsert({
          where: {
            baseCurrency_targetCurrency: {
              baseCurrency,
              targetCurrency: currency,
            },
          },
          update: { rate: 1 / normalizedRate, date: correctionTimestamp },
          create: {
            baseCurrency,
            targetCurrency: currency,
            rate: 1 / normalizedRate,
            date: correctionTimestamp,
          },
        })
      );
    }
  }

  rates[baseCurrency] = 1;

  if (corrections.length > 0) {
    await prisma.$transaction(corrections);
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
  const now = new Date();
  const operations: Prisma.PrismaPromise<any>[] = [];

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

    const normalizedRate = normalizeRateValue(newRate, currency, settings.baseCurrency);

    operations.push(
      prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: currency,
            targetCurrency: settings.baseCurrency,
          },
        },
        update: { rate: normalizedRate, date: now },
        create: {
          baseCurrency: currency,
          targetCurrency: settings.baseCurrency,
          rate: normalizedRate,
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
        update: { rate: 1 / normalizedRate, date: now },
        create: {
          baseCurrency: settings.baseCurrency,
          targetCurrency: currency,
          rate: 1 / normalizedRate,
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
