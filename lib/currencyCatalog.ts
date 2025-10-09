import type { Currency } from "@/lib/types";

export type PopularCurrency = {
  code: Currency;
  title: string;
  rateToUSD: number;
};

export const POPULAR_CURRENCIES: PopularCurrency[] = [
  { code: "USD", title: "Доллар США", rateToUSD: 1 },
  { code: "EUR", title: "Евро", rateToUSD: 1.08 },
  { code: "RUB", title: "Российский рубль", rateToUSD: 0.011 },
  { code: "GEL", title: "Грузинский лари", rateToUSD: 0.37 },
  { code: "UAH", title: "Украинская гривна", rateToUSD: 0.025 },
  { code: "INR", title: "Индийская рупия", rateToUSD: 0.012 },
  { code: "IDR", title: "Индонезийская рупия", rateToUSD: 0.000064 },
  { code: "THB", title: "Тайский бат", rateToUSD: 0.027 },
  { code: "TRY", title: "Турецкая лира", rateToUSD: 0.032 }
];

export const findPopularCurrency = (code: string) =>
  POPULAR_CURRENCIES.find(
    (item) => item.code.toUpperCase() === code.trim().toUpperCase()
  );
