import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant, ensureAuthenticated } from "@/lib/auth";
import { convertToBase, sanitizeCurrency } from "@/lib/currency";
import prisma from "@/lib/prisma";
import { recalculateGoalProgress } from "@/lib/goals";
import { loadSettings } from "@/lib/settingsService";
import { serializeGoal } from "@/lib/serializers";
import type { Goal } from "@/lib/types";

type GoalInput = {
  title: string;
  targetAmount: number;
  currency?: Goal["currency"];
};

const normalizeTitle = (title: string) => title.trim();

export const GET = async (request: NextRequest) => {
  const auth = await ensureAuthenticated(request);

  if (auth.response) {
    return auth.response;
  }

  const goals = await prisma.goal.findMany({ orderBy: { title: "asc" } });

  return NextResponse.json(goals.map(serializeGoal));
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json()) as Partial<GoalInput> | null;

  if (!payload || typeof payload.title !== "string" || typeof payload.targetAmount !== "number") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const title = normalizeTitle(payload.title);
  const amount = Number(payload.targetAmount);

  if (!title) {
    return NextResponse.json({ error: "Укажите название цели" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Целевая сумма должна быть больше нуля" }, { status: 400 });
  }

  const duplicate = await prisma.goal.findFirst({
    where: {
      title: {
        equals: title,
        mode: "insensitive"
      }
    }
  });

  if (duplicate) {
    return NextResponse.json({ error: "Цель с таким названием уже существует" }, { status: 409 });
  }

  const settings = await loadSettings();
  const currency = sanitizeCurrency(payload.currency, settings.baseCurrency);
  const targetInBase = convertToBase(amount, currency, settings);

  const created = await prisma.goal.create({
    data: {
      id: crypto.randomUUID(),
      title,
      target_amount: targetInBase,
      current_amount: 0,
      status: "active",
      currency
    }
  });

  await recalculateGoalProgress();

  const goal = await prisma.goal.findUnique({ where: { id: created.id } });

  return NextResponse.json(goal ? serializeGoal(goal) : serializeGoal(created), {
    status: 201
  });
};
