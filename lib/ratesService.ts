import { BASE_CURRENCY, SUPPORTED_CURRENCIES, getRates, upsertRates } from "@/lib/rates";
import type { Rate } from "@/lib/types";

const EXCHANGE_URL =
  "https://api.exchangerate.host/latest?base=USD&symbols=RUB,EUR,GEL";

const parseResponse = async (response: Response) => {
  const data = (await response.json()) as {
    rates?: Record<string, number>;
    success?: boolean;
    error?: unknown;
  };

  if (!data || !data.rates || ("success" in data && data.success === false)) {
    throw new Error("Некорректный ответ сервиса обменных курсов");
  }

  return data.rates;
};

const toUsdPerUnit = (rate: number): number => {
  if (!Number.isFinite(rate) || rate <= 0) {
    return 1;
  }

  return Number((1 / rate).toFixed(6));
};

export const fetchLatestRates = async (): Promise<Rate[]> => {
  const response = await fetch(EXCHANGE_URL, { next: { revalidate: 0 } });

  if (!response.ok) {
    throw new Error(`API курсов вернуло ${response.status}`);
  }

  const ratesMap = await parseResponse(response);
  const now = new Date().toISOString();

  const rates: Rate[] = SUPPORTED_CURRENCIES.map((currency) => {
    if (currency === BASE_CURRENCY) {
      return { currency, usdPerUnit: 1, updatedAt: now };
    }

    const apiRate = ratesMap[currency];

    if (!apiRate) {
      return { currency, usdPerUnit: 1, updatedAt: now };
    }

    return { currency, usdPerUnit: toUsdPerUnit(apiRate), updatedAt: now };
  });

  return rates;
};

export const updateRates = async () => {
  try {
    const rates = await fetchLatestRates();
    upsertRates(rates);
    return { rates, updatedAt: new Date().toISOString() };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось обновить курсы";
    const existing = getRates();

    if (existing.length > 0) {
      upsertRates(existing);
      return { rates: existing, updatedAt: new Date().toISOString(), error: message };
    }

    const fallbackRates: Rate[] = SUPPORTED_CURRENCIES.map((currency) => ({
      currency,
      usdPerUnit: 1,
      updatedAt: new Date().toISOString()
    }));
    upsertRates(fallbackRates);
    return { rates: fallbackRates, updatedAt: new Date().toISOString(), error: message };
  }
};
