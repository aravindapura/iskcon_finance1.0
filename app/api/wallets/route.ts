import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { isSupportedCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import type { WalletWithCurrency } from "@/lib/types";

type ColumnCheckResult = { exists: boolean };

let ensureWalletCurrencyColumnPromise: Promise<void> | null = null;

const ensureWalletCurrencyColumn = async () => {
  if (!ensureWalletCurrencyColumnPromise) {
    ensureWalletCurrencyColumnPromise = (async () => {
      const result = await prisma.$queryRaw<ColumnCheckResult[]>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'wallets'
            AND column_name = 'currency'
        ) as "exists"
      `;

      const hasCurrencyColumn = result[0]?.exists === true;

      if (hasCurrencyColumn) {
        return;
      }

      await prisma.$executeRawUnsafe(
        `ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "currency" TEXT`
      );
      await prisma.$executeRawUnsafe(
        `UPDATE "wallets" SET "currency" = 'USD' WHERE "currency" IS NULL`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "wallets" ALTER COLUMN "currency" SET DEFAULT 'USD'`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "wallets" ALTER COLUMN "currency" SET NOT NULL`
      );
    })().catch((error) => {
      ensureWalletCurrencyColumnPromise = null;
      throw error;
    });
  }

  return ensureWalletCurrencyColumnPromise;
};

const normalizeWallet = (value: string) => value.trim();

type WalletPayload = {
  name?: string;
  currency?: string;
};

export const GET = async () => {
  await ensureWalletCurrencyColumn();

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

  await ensureWalletCurrencyColumn();

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

  await ensureWalletCurrencyColumn();

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
