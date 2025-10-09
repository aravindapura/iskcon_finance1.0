
import bcrypt from "bcrypt";
import { NextResponse, type NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { SessionUser, UserRole } from "@/lib/types";

type LoginPayload = {
  login?: string;
  password?: string;
};

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

const normalizeLogin = (login: string | undefined) => login?.trim() ?? "";

export const POST = async (request: NextRequest) => {
  let payload: LoginPayload | null = null;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return errorResponse("Некорректный формат запроса", 400);
  }

  const login = normalizeLogin(payload?.login);
  const password = payload?.password ?? "";

  if (!login) {
    return errorResponse("Укажите имя пользователя", 400);
  }

  if (!password) {
    return errorResponse("Введите пароль", 400);
  }

  try {
    const user = await prisma.user.findUnique({ where: { login } });

    if (!user) {
      return errorResponse("Неверные имя пользователя или пароль", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return errorResponse("Неверные имя пользователя или пароль", 401);
    }

    const sessionUser: SessionUser = {
      id: user.id,
      login: user.login,
      role: user.role as UserRole,
    };

    const { token, expiresAt } = createSession(sessionUser.id);
    const response = NextResponse.json({ token, user: sessionUser });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    console.error(error);
    return errorResponse("Не удалось выполнить вход", 500);
  }
};
