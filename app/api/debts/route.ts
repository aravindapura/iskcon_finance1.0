import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { ensureWalletDictionary } from "@/lib/bootstrap";
import { sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import { loadSettings } from "@/lib/settingsService";
import { serializeDebt } from "@/lib/serializers";
import type { Debt } from "@/lib/types";

type DebtInput = {
  type?: Debt["type"];
  amount?: number;
  from?: string;
  to?: string;
  comment?: string;
  currency?: Debt["currency"];
  wallet?: string;
};

export const GET = async () => {
  const debts = await prisma.debt.findMany({
    orderBy: { registered_at: "desc" }
  });

  return NextResponse.json(debts.map(serializeDebt));
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json()) as DebtInput | null;

  if (!payload || (payload.type !== "borrowed" && payload.type !== "lent")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (typeof payload.amount !== "number" || !Number.isFinite(payload.amount) || payload.amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (payload.type === "borrowed" && (!payload.from || typeof payload.from !== "string")) {
    return NextResponse.json({ error: "Debt requires a lender" }, { status: 400 });
  }

  if (payload.type === "lent" && (!payload.to || typeof payload.to !== "string")) {
    return NextResponse.json({ error: "Debt requires a recipient" }, { status: 400 });
  }

  const rawWallet = typeof payload.wallet === "string" ? payload.wallet.trim() : "";

  if (!rawWallet) {
    return NextResponse.json({ error: "Укажите кошелёк" }, { status: 400 });
  }

  await ensureWalletDictionary();

  const wallet = await prisma.wallet.findFirst({
    where: {
      display_name: {
        equals: rawWallet,
        mode: "insensitive"
      }
    }
  });

  if (!wallet) {
    return NextResponse.json({ error: "Некорректный кошелёк" }, { status: 400 });
  }

  const settings = await loadSettings();
  const currency = sanitizeCurrency(payload.currency, settings.baseCurrency);

  const debt = await prisma.debt.create({
    data: {
      id: crypto.randomUUID(),
      type: payload.type,
      amount: payload.amount,
      currency,
      status: "open",
      registered_at: new Date(),
      wallet: wallet.display_name,
      from_contact: payload.type === "borrowed" ? payload.from ?? null : null,
      to_contact: payload.type === "lent" ? payload.to ?? null : null,
      comment: payload.comment?.trim() ? payload.comment.trim() : null
    }
  });

  return NextResponse.json(serializeDebt(debt), { status: 201 });
};

export const DELETE = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Debt id is required" }, { status: 400 });
  }

  try {
    await prisma.debt.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Debt not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
};
