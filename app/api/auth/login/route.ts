import bcrypt from "bcrypt";
import { NextResponse, type NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { SessionUser, UserRole } from "@/lib/types";

export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  let payload: { login?: unknown; password?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректное тело запроса" },
      { status: 400 }
    );
  }

  const { login, password } = payload;

  if (typeof login !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Логин и пароль обязательны" },
      { status: 400 }
    );
  }

  const normalizedLogin = login.trim();
  const normalizedPassword = password.trim();

  if (!normalizedLogin || !normalizedPassword) {
    return NextResponse.json(
      { error: "Укажите логин и пароль" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { login: normalizedLogin } });

    if (!user) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const matches = await bcrypt.compare(normalizedPassword, user.password);

    if (!matches) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: user.id,
      login: user.login,
      role: user.role as UserRole
    };

    const { token, expiresAt } = createSession(user.id);
    const response = NextResponse.json({ user: sessionUser });

    setSessionCookie(response, token, expiresAt);

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Не удалось выполнить вход" },
      { status: 500 }
    );
  }
};
