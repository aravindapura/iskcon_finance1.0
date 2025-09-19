import { NextResponse } from "next/server";
import { getRates } from "@/lib/rates";
import { updateRates } from "@/lib/ratesService";

export const runtime = "nodejs";

export const POST = async () => {
  const result = await updateRates();
  const payload = {
    updatedAt: result.updatedAt,
    rates: getRates(),
    error: "error" in result ? result.error : undefined
  };

  return NextResponse.json(payload, { status: "error" in result ? 207 : 200 });
};

export const GET = async () => {
  const rates = getRates();
  return NextResponse.json({ rates });
};
