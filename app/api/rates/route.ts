import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CURRENCIES = ["USD", "EUR", "RUB", "GEL"] as const;

type Currency = (typeof CURRENCIES)[number];

type RatesResponse = {
  ok: boolean;
  skipped?: boolean;
  count?: number;
  rows: Array<{
    baseCurrency: Currency;
    targetCurrency: Currency;
    rate: number;
    date: Date;
  }>;
};

async function fetchWithTimeout(url: string, ms = 10000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);

  try {
    return await fetch(url, { signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(id);
  }
}

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "1";

    if (!force) {
      const latest = await prisma.exchangeRate.findFirst({
        orderBy: { date: "desc" },
        select: { date: true },
      });

      if (latest) {
        const ageMs = Date.now() - new Date(latest.date).getTime();

        if (ageMs < 24 * 60 * 60 * 1000) {
          const rows = await prisma.exchangeRate.findMany({
            orderBy: [
              { baseCurrency: "asc" },
              { targetCurrency: "asc" },
            ],
          });

          return NextResponse.json({ ok: true, skipped: true, rows } satisfies RatesResponse);
        }
      }
    }

    const updates: Array<{ base: Currency; target: Currency; rate: number }> = [];

    for (const base of CURRENCIES) {
      const symbols = CURRENCIES.filter((currency) => currency !== base).join(",");
      const url = `https://api.exchangerate.host/latest?base=${base}&symbols=${symbols}`;
      const response = await fetchWithTimeout(url, 10000);

      if (!response.ok) {
        return NextResponse.json(
          {
            ok: false,
            reason: `Upstream error ${response.status} ${response.statusText}`,
            base,
          },
          { status: 502 }
        );
      }

      const data = (await response.json()) as { rates?: Record<string, unknown> } | null;
      const rates = data?.rates ?? {};

      for (const [target, value] of Object.entries(rates)) {
        if (!CURRENCIES.includes(target as Currency)) {
          continue;
        }

        const numeric = Number(value);

        if (!Number.isFinite(numeric)) {
          continue;
        }

        updates.push({ base, target: target as Currency, rate: numeric });
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, reason: "No rates received from upstream" },
        { status: 502 }
      );
    }

    const now = new Date();

    await prisma.$transaction(
      updates.map((update) =>
        prisma.exchangeRate.upsert({
          where: {
            baseCurrency_targetCurrency: {
              baseCurrency: update.base,
              targetCurrency: update.target,
            },
          },
          update: { rate: update.rate, date: now },
          create: {
            baseCurrency: update.base,
            targetCurrency: update.target,
            rate: update.rate,
            date: now,
          },
        })
      )
    );

    const rows = await prisma.exchangeRate.findMany({
      orderBy: [
        { baseCurrency: "asc" },
        { targetCurrency: "asc" },
      ],
    });

    return NextResponse.json({ ok: true, count: updates.length, rows } satisfies RatesResponse);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
