import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { SUPPORTED_CURRENCIES, DEFAULT_SETTINGS } from "@/lib/currency";
import { db, recalculateGoalProgress } from "@/lib/operationsStore";
import type { Currency, Settings } from "@/lib/types";

type SettingsPayload = {
  rates?: Partial<Record<Currency, number>>;
};

export const GET = () => NextResponse.json(db.settings ?? DEFAULT_SETTINGS);

export const PATCH = async (request: NextRequest) => {
  const auth = ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json()) as SettingsPayload | null;

  if (!payload || typeof payload !== "object" || !payload.rates) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updatedRates: Settings["rates"] = { ...db.settings.rates };

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency === db.settings.baseCurrency) {
      updatedRates[currency] = 1;
      continue;
    }

    const rawRate = payload.rates[currency];

    if (rawRate === undefined) {
      continue;
    }

    const numericRate = typeof rawRate === "number" ? rawRate : Number(rawRate);

    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      return NextResponse.json(
        {
          error: `Invalid rate for ${currency}`
        },
        { status: 400 }
      );
    }

    updatedRates[currency] = numericRate;
  }

  db.settings.rates = updatedRates;
  recalculateGoalProgress();

  return NextResponse.json(db.settings);
};
