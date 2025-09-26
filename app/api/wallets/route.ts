import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { isSupportedCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import { isWalletAlias, resolveWalletAlias } from "@/lib/walletAliases";

const normalizeWallet = (value: string) => value.trim();

type WalletPayload = {
  name?: string;
  currency?: string | null;
};

export const GET = async () => {
  const wallets = await prisma.wallet.findMany({ orderBy: { display_name: "asc" } });

  return NextResponse.json({
    wallets: wallets.map((wallet) => ({
      name: wallet.display_name,
      currency:
        typeof wallet.currency === "string" && isSupportedCurrency(wallet.currency)
          ? wallet.currency
          : null
    }))
  });
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as WalletPayload | null;

  if (!payload || typeof payload.name !== "string") {
    return NextResponse.json({ error: "Укажите название кошелька" }, { status: 400 });
  }

  const name = normalizeWallet(payload.name);

  if (!name) {
    return NextResponse.json({ error: "Укажите название кошелька" }, { status: 400 });
  }

  let currency: string | null = null;

  if (payload.currency !== undefined && payload.currency !== null) {
    if (typeof payload.currency !== "string" || !isSupportedCurrency(payload.currency)) {
      return NextResponse.json({ error: "Выберите корректную валюту" }, { status: 400 });
    }

    currency = payload.currency;
  }

  if (isWalletAlias(name)) {
    return NextResponse.json({ error: "Такой кошелёк уже существует" }, { status: 409 });
  }

  const normalizedTarget = name.toLowerCase();
  const canonicalName = resolveWalletAlias(name);
  const duplicate = await prisma.wallet.findFirst({
    where: {
      display_name: {
        equals: canonicalName,
        mode: "insensitive"
      }
    }
  });

  if (duplicate) {
    return NextResponse.json({ error: "Такой кошелёк уже существует" }, { status: 409 });
  }

  const slug = normalizedTarget.replace(/\s+/g, "-");

  await prisma.wallet.create({
    data: {
      wallet: slug,
      display_name: name,
      currency
    }
  });

  return NextResponse.json({ name, currency }, { status: 201 });
};

export const DELETE = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as WalletPayload | null;

  if (!payload || typeof payload.name !== "string") {
    return NextResponse.json({ error: "Укажите название кошелька" }, { status: 400 });
  }

  const normalizedTarget = normalizeWallet(payload.name).toLowerCase();

  if (!normalizedTarget) {
    return NextResponse.json({ error: "Укажите название кошелька" }, { status: 400 });
  }

  const wallet = await prisma.wallet.findFirst({
    where: {
      display_name: {
        equals: payload.name,
        mode: "insensitive"
      }
    }
  });

  if (!wallet) {
    return NextResponse.json({ error: "Кошелёк не найден" }, { status: 404 });
  }

  await prisma.wallet.delete({ where: { wallet: wallet.wallet } });

  return NextResponse.json({ name: wallet.display_name });
};
