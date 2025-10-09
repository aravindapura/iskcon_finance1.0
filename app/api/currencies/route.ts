import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { findPopularCurrency } from "@/lib/currencyCatalog";
import { addCurrency, loadSettings } from "@/lib/settingsService";

export const GET = async () => {
  const settings = await loadSettings();

  return NextResponse.json({ currencies: settings.availableCurrencies });
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json()) as { code?: string } | null;

  if (!payload?.code) {
    return NextResponse.json({ error: "Не указана валюта" }, { status: 400 });
  }

  const candidate = findPopularCurrency(payload.code);

  if (!candidate) {
    return NextResponse.json({ error: "Валюта не найдена" }, { status: 404 });
  }

  try {
    const settings = await addCurrency(candidate.code, candidate.rateToUSD);

    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось добавить валюту";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};
