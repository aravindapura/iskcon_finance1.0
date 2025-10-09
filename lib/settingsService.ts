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

type SettingsUpdatePayload = {
  baseCurrency?: Currency;
  rates?: Partial<Record<Currency, number>>;
};

export const updateSettings = async ({
  baseCurrency,
  rates
}: SettingsUpdatePayload): Promise<Settings> => {
  const currentSettings = await loadSettings();
  const ratesToSave: Partial<Record<Currency, number>> = {};

  if (rates) {
    for (const currency of SUPPORTED_CURRENCIES) {
      const newRate = rates[currency];

      if (newRate === undefined) {
        continue;
      }

      if (!isValidRate(newRate)) {
        throw new Error(`Invalid rate for ${currency}`);
      }

      ratesToSave[currency] = currency === "USD" ? 1 : newRate;
    }
  }

  const baseCurrencyChanged =
    baseCurrency !== undefined && baseCurrency !== currentSettings.baseCurrency;
  const nextBaseCurrency = baseCurrencyChanged
    ? baseCurrency
    : currentSettings.baseCurrency;

  if (nextBaseCurrency === "USD") {
    ratesToSave.USD = 1;
  } else if (ratesToSave[nextBaseCurrency] === undefined) {
    const existingRate = currentSettings.rates[nextBaseCurrency];

    ratesToSave[nextBaseCurrency] = isValidRate(existingRate) ? existingRate : 1;
  }

  const operations: Promise<unknown>[] = [];

  for (const [currency, rate] of Object.entries(ratesToSave)) {
    operations.push(
      prisma.currencyRate.upsert({
        where: { currency },
        update: { rate },
        create: { currency, rate }
      })
    );
  }

  if (baseCurrencyChanged) {
    operations.push(
      prisma.settings.create({ data: { base_currency: nextBaseCurrency } })
    );
  }

  await Promise.all(operations);

  return loadSettings();
};
