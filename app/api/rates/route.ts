// app/api/rates/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settingsService";

export const revalidate = 0; // отключаем кеш

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.has("force");

  try {
    const settings = await loadSettings();
    const targetSet = new Set<string>(settings.availableCurrencies);
    const targets = Array.from(targetSet);

    // запрос к бесплатному API
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });
    const data = await res.json();

    if (data.result !== "success") {
      return NextResponse.json(
        { ok: false, reason: "API error", data },
        { status: 500 }
      );
    }

    const updates: any[] = [];
    const now = new Date();

    for (const cur of targets) {
      if (data.rates[cur]) {
        const rawRate = Number(data.rates[cur]);

        if (!Number.isFinite(rawRate) || rawRate <= 0) {
          continue;
        }

        const rate = 1 / rawRate;

        // сохраняем или обновляем в БД
        await prisma.currencyRate.upsert({
          where: { currency: cur },
          update: { rate, updated_at: now },
          create: { currency: cur, rate, updated_at: now },
        });

        updates.push({ currency: cur, rate });
      }
    }

    // достаём всё из БД
    const rows = await prisma.currencyRate.findMany({
      orderBy: { currency: "asc" },
    });

    return NextResponse.json({
      ok: true,
      force,
      count: updates.length,
      updates,
      rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
