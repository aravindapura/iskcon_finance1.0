import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { ensureWalletDictionary } from "@/lib/bootstrap";
import prisma from "@/lib/prisma";

const normalizeWallet = (value: string) => value.trim();

type WalletPayload = {
  name?: string;
};

export const GET = async () => {
  await ensureWalletDictionary();

  const wallets = await prisma.wallet.findMany({ orderBy: { display_name: "asc" } });

  return NextResponse.json({ wallets: wallets.map((wallet) => wallet.display_name) });
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  await ensureWalletDictionary();

  const payload = (await request.json().catch(() => null)) as WalletPayload | null;

  if (!payload || typeof payload.name !== "string") {
    return NextResponse.json({ error: "Укажите название кошелька" }, { status: 400 });
  }

  const name = normalizeWallet(payload.name);

  if (!name) {
    return NextResponse.json({ error: "Укажите название кошелька" }, { status: 400 });
  }

  const normalizedTarget = name.toLowerCase();
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

  await prisma.wallet.create({
    data: {
      wallet: slug,
      display_name: name
    }
  });

  return NextResponse.json({ name }, { status: 201 });
};

export const DELETE = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  await ensureWalletDictionary();

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
