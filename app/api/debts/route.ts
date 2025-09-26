import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ensureAccountant } from "@/lib/auth";
import { sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import { resolveWalletAlias } from "@/lib/walletAliases";
import { recalculateGoalProgress } from "@/lib/goals";
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
  existing?: boolean;
};

const normalizeName = (value: string) => value.trim();

const ensureExpenseCategory = async (
  tx: Prisma.TransactionClient,
  name: string
) => {
  const normalized = normalizeName(name);

  const existing = await tx.category.findFirst({
    where: {
      type: "expense",
      name: {
        equals: normalized,
        mode: "insensitive"
      }
    }
  });

  if (existing) {
    return existing.name;
  }

  const created = await tx.category.create({
    data: {
      type: "expense",
      name: normalized
    }
  });

  return created.name;
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

  const trimmedFrom =
    typeof payload.from === "string" && payload.from.trim() ? payload.from.trim() : "";
  const trimmedTo =
    typeof payload.to === "string" && payload.to.trim() ? payload.to.trim() : "";

  if (payload.type === "borrowed" && !trimmedFrom) {
    return NextResponse.json({ error: "Debt requires a lender" }, { status: 400 });
  }

  if (payload.type === "lent" && !trimmedTo) {
    return NextResponse.json({ error: "Debt requires a recipient" }, { status: 400 });
  }

  const rawWallet = typeof payload.wallet === "string" ? payload.wallet.trim() : "";

  if (!rawWallet) {
    return NextResponse.json({ error: "Укажите кошелёк" }, { status: 400 });
  }

  const canonicalWallet = resolveWalletAlias(rawWallet);
  const wallet = await prisma.wallet.findFirst({
    where: {
      display_name: {
        equals: canonicalWallet,
        mode: "insensitive"
      }
    }
  });

  if (!wallet) {
    return NextResponse.json({ error: "Некорректный кошелёк" }, { status: 400 });
  }

  const settings = await loadSettings();
  const currency = sanitizeCurrency(payload.currency, settings.baseCurrency);

  const debtName =
    payload.type === "borrowed" ? normalizeName(trimmedFrom) : normalizeName(trimmedTo);

  const commentValue =
    typeof payload.comment === "string" && payload.comment.trim().length > 0
      ? payload.comment.trim()
      : undefined;

  const isExistingDebt = payload.existing === true;

  const storedComment = isExistingDebt
    ? JSON.stringify({
        existing: true,
        note: commentValue
      })
    : commentValue ?? null;

  const now = new Date();

  const debt = await prisma.$transaction(async (tx) => {
    const createdDebt = await tx.debt.create({
      data: {
        id: crypto.randomUUID(),
        type: payload.type!,
        amount: payload.amount!,
        currency,
        status: "open",
        registered_at: now,
        wallet: wallet.display_name,
        from_contact: payload.type === "borrowed" ? debtName : null,
        to_contact: payload.type === "lent" ? debtName : null,
        comment: storedComment
      }
    });

    await ensureExpenseCategory(tx, debtName);

    return createdDebt;
  });

  await recalculateGoalProgress();

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
    await prisma.$transaction(async (tx) => {
      await tx.operation.deleteMany({ where: { source: `debt:${id}` } });
      await tx.debt.delete({ where: { id } });
    });
  } catch {
    return NextResponse.json({ error: "Debt not found" }, { status: 404 });
  }

  await recalculateGoalProgress();

  return NextResponse.json({ success: true });
};
