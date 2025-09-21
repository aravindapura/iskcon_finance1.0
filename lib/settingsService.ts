import { DEFAULT_SETTINGS, SUPPORTED_CURRENCIES, sanitizeCurrency } from "@/lib/currency";
import { ensureSettingsSchema } from "@/lib/bootstrap";
import prisma from "@/lib/prisma";
import type { Currency, Settings } from "@/lib/types";

const isValidRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const loadSettings = async (): Promise<Settings> => {
  await ensureSettingsSchema();

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

  rates[baseCurrency] = 1;

  return {
    baseCurrency,
    rates
  };
};

export const applyRatesUpdate = async (
  ratesUpdate: Partial<Record<Currency, number>>
): Promise<Settings> => {
  await ensureSettingsSchema();

  const settings = await loadSettings();
  const operations: Promise<unknown>[] = [];

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency === settings.baseCurrency) {
      operations.push(
        prisma.currencyRate.upsert({
          where: { currency },
          update: { rate: 1 },
          create: { currency, rate: 1 }
        })
      );
      continue;
    }

    const newRate = ratesUpdate[currency];

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
