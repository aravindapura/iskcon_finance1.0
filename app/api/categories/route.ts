import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant, ensureAuthenticated } from "@/lib/auth";
import prisma from "@/lib/prisma";

const normalizeCategory = (value: string) => value.trim();

type CategoryPayload = {
  type?: "income" | "expense";
  name?: string;
};

export const GET = async (request: NextRequest) => {
  const auth = await ensureAuthenticated(request);

  if (auth.response) {
    return auth.response;
  }

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const income: string[] = [];
  const expense: string[] = [];

  for (const category of categories) {
    if (category.type === "income") {
      income.push(category.name);
    } else if (category.type === "expense") {
      expense.push(category.name);
    }
  }

  return NextResponse.json({ income, expense });
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as CategoryPayload | null;

  if (!payload || (payload.type !== "income" && payload.type !== "expense")) {
    return NextResponse.json({ error: "Некорректный тип категории" }, { status: 400 });
  }

  if (typeof payload.name !== "string") {
    return NextResponse.json({ error: "Укажите название категории" }, { status: 400 });
  }

  const name = normalizeCategory(payload.name);

  if (!name) {
    return NextResponse.json({ error: "Укажите название категории" }, { status: 400 });
  }

  const duplicate = await prisma.category.findFirst({
    where: {
      type: payload.type,
      name: {
        equals: name,
        mode: "insensitive"
      }
    }
  });

  if (duplicate) {
    return NextResponse.json({ error: "Такая категория уже существует" }, { status: 409 });
  }

  await prisma.category.create({
    data: {
      type: payload.type,
      name
    }
  });

  return NextResponse.json({ type: payload.type, name }, { status: 201 });
};

export const DELETE = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as CategoryPayload | null;

  if (!payload || (payload.type !== "income" && payload.type !== "expense")) {
    return NextResponse.json({ error: "Некорректный тип категории" }, { status: 400 });
  }

  if (typeof payload.name !== "string") {
    return NextResponse.json({ error: "Укажите название категории" }, { status: 400 });
  }

  const normalizedTarget = normalizeCategory(payload.name).toLowerCase();

  if (!normalizedTarget) {
    return NextResponse.json({ error: "Укажите название категории" }, { status: 400 });
  }

  const category = await prisma.category.findFirst({
    where: {
      type: payload.type,
      name: {
        equals: payload.name,
        mode: "insensitive"
      }
    }
  });

  if (!category) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }

  await prisma.category.delete({ where: { id: category.id } });

  return NextResponse.json({ type: payload.type, name: category.name });
};
