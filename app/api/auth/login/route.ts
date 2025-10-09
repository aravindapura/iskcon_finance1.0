import bcrypt from "bcrypt";
import { NextResponse, type NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/types";

type LoginPayload = {
  login?: unknown;
  password?: unknown;
};

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const toTrimmedString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const POST = async (request: NextRequest) => {
  let payload: LoginPayload | null = null;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return errorResponse("Некорректный формат запроса", 400);
  }

  const rawLogin = typeof payload?.login === "string" ? payload.login : "";
  const login = toTrimmedString(rawLogin);
  const password = toTrimmedString(payload?.password);

  if (!isNonEmptyString(login)) {
    return errorResponse("Укажите имя пользователя", 400);
  }

  if (!isNonEmptyString(password)) {
    return errorResponse("Введите пароль", 400);
  }

  try {
    let user = await prisma.user.findFirst({
      where: { login: { equals: login, mode: "insensitive" } },
    });

    if (!user && rawLogin && rawLogin !== login) {
      user = await prisma.user.findUnique({ where: { login: rawLogin } });
    }

    if (!user) {
      return errorResponse("Неверные имя пользователя или пароль", 401);
    }

    let passwordMatches = false;

    if (user.password.startsWith("$2")) {
      passwordMatches = await bcrypt.compare(password, user.password);
    } else if (user.password === password) {
      const nextHash = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: nextHash },
      });

      passwordMatches = true;
    }

    if (!passwordMatches) {
      return errorResponse("Неверные имя пользователя или пароль", 401);
    }

    const sessionUser: SessionUser = {
      id: user.id,
      login: user.login,
      role: user.role === "admin" ? "admin" : "user",
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
