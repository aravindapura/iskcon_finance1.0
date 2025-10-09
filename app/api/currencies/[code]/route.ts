import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { removeCurrency } from "@/lib/settingsService";

const PASSWORD = "108";

export const DELETE = async (
  request: NextRequest,
  { params }: { params: { code: string } }
) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json()) as { password?: string } | null;

  if (payload?.password !== PASSWORD) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 403 });
  }

  try {
    const settings = await removeCurrency(params.code);

    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось удалить валюту";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};
