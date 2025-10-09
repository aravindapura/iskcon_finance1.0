import type { Currency } from "@/lib/types";

export type PopularCurrency = {
  code: Currency;
  title: string;
  rateToUSD: number;
};

export const POPULAR_CURRENCIES: PopularCurrency[] = [
  { code: "USD", title: "Доллар США", rateToUSD: 1 },
  { code: "EUR", title: "Евро", rateToUSD: 1.08 },
  { code: "GBP", title: "Британский фунт", rateToUSD: 1.27 },
  { code: "CHF", title: "Швейцарский франк", rateToUSD: 1.12 },
  { code: "CNY", title: "Китайский юань", rateToUSD: 0.14 },
  { code: "JPY", title: "Японская иена", rateToUSD: 0.0064 },
  { code: "INR", title: "Индийская рупия", rateToUSD: 0.012 },
  { code: "TRY", title: "Турецкая лира", rateToUSD: 0.031 },
  { code: "AED", title: "Дирхам ОАЭ", rateToUSD: 0.27 },
  { code: "CAD", title: "Канадский доллар", rateToUSD: 0.74 }
];

export const findPopularCurrency = (code: string) =>
  POPULAR_CURRENCIES.find(
    (item) => item.code.toUpperCase() === code.trim().toUpperCase()
  );
