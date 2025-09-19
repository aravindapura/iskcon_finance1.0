import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import type { Goal } from "@/lib/types";

type GoalInput = {
  title: string;
  targetAmount: number;
};

const normalizeTitle = (title: string) => title.trim();

export const GET = () => NextResponse.json(db.goals);

export const POST = async (request: NextRequest) => {
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

  const duplicate = db.goals.find((goal) => goal.title.toLowerCase() === title.toLowerCase());

  if (duplicate) {
    return NextResponse.json({ error: "Цель с таким названием уже существует" }, { status: 409 });
  }

  const goal: Goal = {
    id: crypto.randomUUID(),
    title,
    targetAmount: amount,
    currentAmount: 0,
    status: "active"
  };

  db.goals.unshift(goal);

  return NextResponse.json(goal, { status: 201 });
};
