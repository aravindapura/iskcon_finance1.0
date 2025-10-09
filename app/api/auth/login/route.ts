
import { timingSafeEqual } from "node:crypto";
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

const isBcryptHash = (value: string) => value.startsWith("$2");

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  try {
    return timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
};

const verifyPassword = async (password: string, stored: string) => {
  if (!stored) {
    return false;
  }

  if (isBcryptHash(stored)) {
    try {
      return await bcrypt.compare(password, stored);
    } catch (error) {
      console.error("bcrypt.compare failed", error);
      return false;
    }
  }

  return safeEqual(password, stored);
};

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

    const passwordMatches = await verifyPassword(password, user.password);

    if (!passwordMatches) {
      return errorResponse("Неверные имя пользователя или пароль", 401);
    }

    if (user.password && !isBcryptHash(user.password)) {
      try {
        const hashed = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashed }
        });
      } catch (error) {
        console.error("Не удалось обновить пароль пользователя", error);
      }
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
