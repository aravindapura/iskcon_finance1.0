import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { isSupportedCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import type { WalletWithCurrency } from "@/lib/types";

const normalizeWallet = (value: string) => value.trim();

type WalletPayload = {
  name?: string;
  currency?: string;
};

export const GET = async () => {
  const wallets = await prisma.wallet.findMany({ orderBy: { display_name: "asc" } });

  return NextResponse.json({
    wallets: wallets.map((wallet) => ({
      id: wallet.wallet,
      name: wallet.display_name,
      currency: isSupportedCurrency(wallet.currency) ? wallet.currency : "USD"
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

  const normalizedTarget = name.toLowerCase();

  if (!isSupportedCurrency(payload.currency)) {
    return NextResponse.json(
      { error: "Выберите валюту из списка" },
      { status: 400 }
    );
  }

  const currency = payload.currency;
  const duplicate = await prisma.wallet.findFirst({
    where: {
      display_name: {
        equals: name,
        mode: "insensitive"
      }
    }
  });

  if (duplicate) {
    return NextResponse.json({ error: "Такой кошелёк уже существует" }, { status: 409 });
  }

  const slug = normalizedTarget.replace(/\s+/g, "-");

  const created = await prisma.wallet.create({
    data: {
      wallet: slug,
      display_name: name,
      currency
    }
  });

  const responseWallet: WalletWithCurrency = {
    id: created.wallet,
    name: created.display_name,
    currency
  };

  return NextResponse.json({ wallet: responseWallet }, { status: 201 });
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

  const responseWallet: WalletWithCurrency = {
    id: wallet.wallet,
    name: wallet.display_name,
    currency: isSupportedCurrency(wallet.currency) ? wallet.currency : "USD"
  };

  return NextResponse.json({ wallet: responseWallet });
};
