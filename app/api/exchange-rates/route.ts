import { NextResponse } from "next/server";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import prisma from "@/lib/prisma";
import type { Currency } from "@/lib/types";

const isSupported = (value: string): value is Currency =>
  SUPPORTED_CURRENCIES.includes(value as Currency);

export const GET = async () => {
  const rows = await prisma.exchangeRate.findMany({
    orderBy: [
      { baseCurrency: "asc" },
      { targetCurrency: "asc" },
    ],
  });

  const rates = rows
    .filter((row) => isSupported(row.baseCurrency) && isSupported(row.targetCurrency))
    .map((row) => ({
      id: row.id,
      baseCurrency: row.baseCurrency as Currency,
      targetCurrency: row.targetCurrency as Currency,
      rate: Number(row.rate),
      date: row.date.toISOString(),
    }));

  return NextResponse.json({ rates });
};
