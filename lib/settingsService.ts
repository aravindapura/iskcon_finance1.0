// trigger redeploy
import { DEFAULT_SETTINGS, sanitizeCurrency } from "@/lib/currency";
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

  const rates: Settings["rates"] = { ...DEFAULT_SETTINGS.rates, USD: 1 };
  const available = new Set<Currency>(DEFAULT_SETTINGS.availableCurrencies);

  for (const rate of rateRows) {
    const currency = rate.currency as Currency;

    const numericRate = Number(rate.rate);

    if (!isValidRate(numericRate)) {
      continue;
    }

    rates[currency] = currency === "USD" ? 1 : numericRate;
    available.add(currency);
  }

  if (!available.has(baseCurrency)) {
    available.add(baseCurrency);
  }

  if (!isValidRate(rates[baseCurrency])) {
    rates[baseCurrency] = baseCurrency === "USD" ? 1 : 1;
  }

  return {
    baseCurrency,
    rates,
    availableCurrencies: Array.from(available)
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
    for (const [currency, rawRate] of Object.entries(rates)) {
      if (rawRate === undefined) {
        continue;
      }

      const normalizedCurrency = sanitizeCurrency(currency);
      const numericRate = Number(rawRate);

      if (!isValidRate(numericRate)) {
        throw new Error(`Invalid rate for ${normalizedCurrency}`);
      }

      ratesToSave[normalizedCurrency] =
        normalizedCurrency === "USD" ? 1 : numericRate;
    }
  }

  const baseCurrencyChanged =
    baseCurrency !== undefined && baseCurrency !== currentSettings.baseCurrency;
  const nextBaseCurrency = baseCurrencyChanged
    ? sanitizeCurrency(baseCurrency)
    : currentSettings.baseCurrency;

  if (
    baseCurrencyChanged &&
    !currentSettings.availableCurrencies.includes(nextBaseCurrency)
  ) {
    throw new Error("Выбранная валюта недоступна");
  }

  if (ratesToSave[nextBaseCurrency] === undefined) {
    const existingRate = currentSettings.rates[nextBaseCurrency];

    ratesToSave[nextBaseCurrency] =
      nextBaseCurrency === "USD" || isValidRate(existingRate)
        ? existingRate ?? 1
        : 1;
  }

  const operations: Promise<unknown>[] = [];

  for (const [currency, rate] of Object.entries(ratesToSave)) {
    if (rate === undefined) {
      continue;
    }

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

export const addCurrency = async (
  code: Currency,
  rateToUSD: number
): Promise<Settings> => {
  const currency = sanitizeCurrency(code);
  const numericRate = Number(rateToUSD);

  if (!isValidRate(numericRate)) {
    throw new Error("Некорректный курс");
  }

  await prisma.currencyRate.upsert({
    where: { currency },
    update: { rate: currency === "USD" ? 1 : numericRate },
    create: { currency, rate: currency === "USD" ? 1 : numericRate }
  });

  return loadSettings();
};

export const removeCurrency = async (code: Currency): Promise<Settings> => {
  const currency = sanitizeCurrency(code);
  const currentSettings = await loadSettings();

  if (!currentSettings.availableCurrencies.includes(currency)) {
    return currentSettings;
  }

  await prisma.currencyRate
    .delete({ where: { currency } })
    .catch(() => undefined);

  let nextSettings = await loadSettings();

  const fallback =
    nextSettings.availableCurrencies.find((item) => item !== currency) ??
    DEFAULT_SETTINGS.baseCurrency;

  if (!nextSettings.availableCurrencies.includes(fallback)) {
    nextSettings.availableCurrencies.push(fallback);
  }

  if (nextSettings.baseCurrency === currency) {
    await prisma.settings.create({ data: { base_currency: fallback } });
    nextSettings = await loadSettings();
  }

  return nextSettings;
};
