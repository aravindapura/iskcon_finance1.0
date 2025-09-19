"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { BASE_CURRENCY, SUPPORTED_CURRENCIES, isCurrencyCode, type CurrencyCode } from "@/lib/currency";

type CurrencyContextValue = {
  baseCurrency: CurrencyCode;
  currency: CurrencyCode;
  supportedCurrencies: readonly CurrencyCode[];
  setCurrency: (currency: CurrencyCode) => void;
  convertToSelected: (amount: number, fromCurrency?: string) => number;
  convertFromSelected: (amount: number) => number;
  format: (amount: number, fromCurrency?: string) => string;
  formatSelected: (amount: number) => string;
  loading: boolean;
  error: string | null;
  isReady: boolean;
  reload: () => Promise<void>;
};

type RatesMap = Record<CurrencyCode, number>;

type ExchangeRatesResponse = {
  success?: boolean;
  rates?: Record<string, number>;
};

const DEFAULT_RATES: RatesMap = SUPPORTED_CURRENCIES.reduce(
  (accumulator, code) => ({
    ...accumulator,
    [code]: code === BASE_CURRENCY ? 1 : 1
  }),
  {} as RatesMap
);

const STORAGE_KEY = "iskcon-finance:currency";

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const parseRate = (value: unknown): number | null => {
  if (typeof value !== "number") {
    return null;
  }

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
};

const normalizeCurrency = (value?: string | null): CurrencyCode => {
  if (!value) {
    return BASE_CURRENCY;
  }

  const upper = value.toUpperCase();
  return isCurrencyCode(upper) ? upper : BASE_CURRENCY;
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(BASE_CURRENCY);
  const [rates, setRates] = useState<RatesMap>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "https://api.exchangerate.host/latest?base=USD&symbols=RUB,EUR,GEL"
      );

      if (!response.ok) {
        throw new Error(`Не удалось загрузить курсы валют: ${response.status}`);
      }

      const data = (await response.json()) as ExchangeRatesResponse;
      const rubRate = parseRate(data.rates?.RUB);
      const eurRate = parseRate(data.rates?.EUR);
      const gelRate = parseRate(data.rates?.GEL);

      if (!rubRate || !eurRate || !gelRate) {
        throw new Error("Ответ сервиса не содержит корректные курсы валют");
      }

      setRates({
        USD: 1,
        RUB: rubRate,
        EUR: eurRate,
        GEL: gelRate
      });
      setIsReady(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось получить курсы валют. Попробуйте обновить позже."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedCurrency = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;

    if (storedCurrency) {
      setCurrencyState(normalizeCurrency(storedCurrency));
    }
  }, []);

  useEffect(() => {
    void fetchRates();
  }, [fetchRates]);

  useEffect(() => {
    if (!isReady && currency !== BASE_CURRENCY) {
      setCurrencyState(BASE_CURRENCY);
    }
  }, [currency, isReady]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    setCurrencyState(nextCurrency);
  }, []);

  const getRate = useCallback(
    (code: CurrencyCode): number => {
      if (code === BASE_CURRENCY) {
        return 1;
      }

      return rates[code] ?? 1;
    },
    [rates]
  );

  const convertToSelected = useCallback(
    (amount: number, fromCurrency?: string): number => {
      if (!Number.isFinite(amount)) {
        return 0;
      }

      const sourceCurrency = normalizeCurrency(fromCurrency);

      if (sourceCurrency === currency) {
        return amount;
      }

      const baseAmount =
        sourceCurrency === BASE_CURRENCY ? amount : amount / getRate(sourceCurrency);

      return currency === BASE_CURRENCY ? baseAmount : baseAmount * getRate(currency);
    },
    [currency, getRate]
  );

  const convertFromSelected = useCallback(
    (amount: number): number => {
      if (!Number.isFinite(amount)) {
        return 0;
      }

      if (currency === BASE_CURRENCY) {
        return amount;
      }

      const rate = getRate(currency);

      return rate ? amount / rate : amount;
    },
    [currency, getRate]
  );

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency
      }),
    [currency]
  );

  const formatSelected = useCallback(
    (amount: number): string => formatter.format(amount),
    [formatter]
  );

  const format = useCallback(
    (amount: number, fromCurrency?: string): string =>
      formatSelected(convertToSelected(amount, fromCurrency)),
    [convertToSelected, formatSelected]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      baseCurrency: BASE_CURRENCY,
      currency,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      setCurrency,
      convertToSelected,
      convertFromSelected,
      format,
      formatSelected,
      loading,
      error,
      isReady,
      reload: fetchRates
    }),
    [
      currency,
      setCurrency,
      convertToSelected,
      convertFromSelected,
      format,
      formatSelected,
      loading,
      error,
      isReady,
      fetchRates
    ]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency должен использоваться внутри CurrencyProvider");
  }

  return context;
};
