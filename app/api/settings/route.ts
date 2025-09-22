import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { recalculateGoalProgress } from "@/lib/goals";
import { applyRatesUpdate, loadSettings } from "@/lib/settingsService";
import type { Currency } from "@/lib/types";

type SettingsPayload = {
  rates?: Partial<Record<Currency, number>>;
};

export const GET = async () => NextResponse.json(await loadSettings());

export const PATCH = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json()) as SettingsPayload | null;

  if (!payload || typeof payload !== "object" || !payload.rates) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const newRates: Partial<Record<Currency, number>> = {};

  for (const currency of SUPPORTED_CURRENCIES) {
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

    newRates[currency] = numericRate;
  }

  const settings = await applyRatesUpdate(newRates);
  await recalculateGoalProgress();

  return NextResponse.json(settings);
};
