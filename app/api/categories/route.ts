import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import { db } from "@/lib/operationsStore";

const normalizeCategory = (value: string) => value.trim();

type CategoryPayload = {
  type?: "income" | "expense";
  name?: string;
};

export const GET = () => NextResponse.json(db.categories);

export const POST = async (request: NextRequest) => {
  const auth = ensureAccountant(request);

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

  const normalizedName = name.toLowerCase();
  const categories = db.categories[payload.type];

  const duplicate = categories.some((item) => item.trim().toLowerCase() === normalizedName);

  if (duplicate) {
    return NextResponse.json({ error: "Такая категория уже существует" }, { status: 409 });
  }

  categories.push(name);

  return NextResponse.json({ type: payload.type, name }, { status: 201 });
};

export const DELETE = async (request: NextRequest) => {
  const auth = ensureAccountant(request);

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

  const categories = db.categories[payload.type];
  const index = categories.findIndex(
    (item) => normalizeCategory(item).toLowerCase() === normalizedTarget
  );

  if (index === -1) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }

  const [removed] = categories.splice(index, 1);

  return NextResponse.json({ type: payload.type, name: removed });
};
