import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { recalculateGoalProgress } from "@/lib/goals";
import { loadSettings, updateSettings } from "@/lib/settingsService";
import type { Currency } from "@/lib/types";

type SettingsPayload = {
  baseCurrency?: Currency;
  rates?: Partial<Record<Currency, number>>;
};

export const GET = async () => NextResponse.json(await loadSettings());

export const PATCH = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json()) as SettingsPayload | null;

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const currentSettings = await loadSettings();
  const nextRates: Partial<Record<Currency, number>> = {};

  if (payload.rates) {
    for (const [currency, rawRate] of Object.entries(payload.rates)) {
      if (rawRate === undefined) {
        continue;
      }

      if (!currentSettings.availableCurrencies.includes(currency)) {
        return NextResponse.json(
          { error: `Валюта ${currency} недоступна` },
          { status: 400 }
        );
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

      nextRates[currency] = numericRate;
    }
  }

  let nextBaseCurrency: Currency | undefined;

  if (payload.baseCurrency !== undefined) {
    if (!currentSettings.availableCurrencies.includes(payload.baseCurrency)) {
      return NextResponse.json(
        { error: "Unsupported base currency" },
        { status: 400 }
      );
    }

    nextBaseCurrency = payload.baseCurrency;
  }

  if (!nextBaseCurrency && Object.keys(nextRates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const settings = await updateSettings({
      baseCurrency: nextBaseCurrency,
      rates: Object.keys(nextRates).length > 0 ? nextRates : undefined
    });
    await recalculateGoalProgress();

    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось обновить настройки";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
