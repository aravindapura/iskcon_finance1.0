import bcrypt from "bcrypt";
import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  PASSWORD_MIN_LENGTH,
  createRandomPassword,
  ensureUsersTable,
  isValidUserRole
} from "@/lib/users";

type Params = {
  params: { id: string };
};

const toResponseUser = (user: {
  id: string;
  login: string;
  role: string;
  createdAt: Date | null;
}) => ({
  id: user.id,
  login: user.login,
  role: user.role,
  createdAt: user.createdAt ? user.createdAt.toISOString() : null
});

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  const { id } = params;

  let payload: {
    role?: unknown;
    password?: unknown;
    generatePassword?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректное тело запроса" },
      { status: 400 }
    );
  }

  const { role, password, generatePassword } = payload;

  if (role !== undefined && !isValidUserRole(role)) {
    return NextResponse.json(
      { error: "Некорректная роль пользователя" },
      { status: 400 }
    );
  }

  if (password !== undefined && typeof password !== "string") {
    return NextResponse.json(
      { error: "Некорректный пароль" },
      { status: 400 }
    );
  }

  const trimmedPassword =
    typeof password === "string" ? password.trim() : undefined;

  if (
    typeof trimmedPassword === "string" &&
    trimmedPassword.length > 0 &&
    trimmedPassword.length < PASSWORD_MIN_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `Пароль должен содержать не менее ${PASSWORD_MIN_LENGTH} символов`
      },
      { status: 400 }
    );
  }

  const shouldGenerate = generatePassword === true;

  try {
    await ensureUsersTable();

    const existing = await prisma.user.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const updateData: { role?: string; password?: string } = {};
    let generatedPassword: string | null = null;

    if (isValidUserRole(role) && role !== existing.role) {
      updateData.role = role;
    }

    if (typeof trimmedPassword === "string" && trimmedPassword.length > 0) {
      updateData.password = await bcrypt.hash(trimmedPassword, 10);
    } else if (shouldGenerate) {
      generatedPassword = createRandomPassword();
      updateData.password = await bcrypt.hash(generatedPassword, 10);
    }

    if (!updateData.role && !updateData.password) {
      return NextResponse.json({ user: toResponseUser(existing) });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      user: toResponseUser(updated),
      ...(generatedPassword ? { password: generatedPassword } : {})
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Не удалось обновить пользователя";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
