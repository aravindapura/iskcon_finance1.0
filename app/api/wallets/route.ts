import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { db } from "@/lib/operationsStore";

const normalizeWallet = (value: string) => value.trim();

type WalletPayload = {
  name?: string;
};

export const GET = () => NextResponse.json({ wallets: db.wallets });

export const POST = async (request: NextRequest) => {
  const auth = ensureAccountant(request);

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
  const duplicate = db.wallets.some(
    (wallet) => normalizeWallet(wallet).toLowerCase() === normalizedTarget
  );

  if (duplicate) {
    return NextResponse.json({ error: "Такой кошелёк уже существует" }, { status: 409 });
  }

  db.wallets.push(name);

  return NextResponse.json({ name }, { status: 201 });
};

export const DELETE = async (request: NextRequest) => {
  const auth = ensureAccountant(request);

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

  const index = db.wallets.findIndex(
    (wallet) => normalizeWallet(wallet).toLowerCase() === normalizedTarget
  );

  if (index === -1) {
    return NextResponse.json({ error: "Кошелёк не найден" }, { status: 404 });
  }

  const [removed] = db.wallets.splice(index, 1);

  return NextResponse.json({ name: removed });
};
