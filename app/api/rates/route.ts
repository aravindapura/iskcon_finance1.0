import { NextResponse } from "next/server";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { recalculateGoalProgress } from "@/lib/goals";
import prisma from "@/lib/prisma";
import type { Currency } from "@/lib/types";

export const dynamic = "force-dynamic";

const isValidRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

type ExternalRatesResponse = {
  rates?: Record<string, number>;
  date?: string;
};

const fetchRatesForBase = async (base: Currency) => {
  const url = new URL("https://api.exchangerate.host/latest");
  url.searchParams.set("base", base);
  url.searchParams.set("symbols", SUPPORTED_CURRENCIES.join(","));

  const response = await fetch(url.toString(), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Не удалось получить курсы для ${base}`);
  }

  const data = (await response.json()) as ExternalRatesResponse;

  if (!data || typeof data !== "object" || !data.rates || typeof data.rates !== "object") {
    throw new Error(`Неверный ответ сервиса для ${base}`);
  }

  const effectiveDate = data.date ? new Date(`${data.date}T00:00:00Z`) : new Date();

  if (Number.isNaN(effectiveDate.getTime())) {
    throw new Error(`Неверная дата в ответе сервиса для ${base}`);
  }

  const rates = data.rates as Record<string, unknown>;

  return SUPPORTED_CURRENCIES.map((target) => {
    const rawRate = target === base ? 1 : rates[target];
    const numericRate = target === base ? 1 : Number(rawRate);

    if (!isValidRate(numericRate)) {
      throw new Error(`Неверный курс для пары ${base}/${target}`);
    }

    return {
      baseCurrency: base,
      targetCurrency: target,
      rate: numericRate,
      date: effectiveDate,
    };
  });
};

export const GET = async () => {
  try {
    const rateGroups = await Promise.all(
      SUPPORTED_CURRENCIES.map((base) => fetchRatesForBase(base as Currency))
    );
    const rates = rateGroups.flat();

    const transactions = rates.map((rate) =>
      prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: rate.baseCurrency,
            targetCurrency: rate.targetCurrency,
          },
        },
        update: {
          rate: rate.rate,
          date: rate.date,
        },
        create: {
          baseCurrency: rate.baseCurrency,
          targetCurrency: rate.targetCurrency,
          rate: rate.rate,
          date: rate.date,
        },
      })
    );

    const stored = await prisma.$transaction(transactions);

    await recalculateGoalProgress();

    const payload = stored.map((row) => ({
      id: row.id,
      baseCurrency: row.baseCurrency as Currency,
      targetCurrency: row.targetCurrency as Currency,
      rate: Number(row.rate),
      date: row.date.toISOString(),
    }));

    return NextResponse.json({ rates: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось обновить курсы";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
