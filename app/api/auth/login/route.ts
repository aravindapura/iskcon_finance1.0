import { NextResponse, type NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { ensureDefaultUsers } from "@/lib/bootstrap";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/types";

type LoginPayload = {
  login?: string;
  password?: string;
};

const normalizeLogin = (value: string) => value.trim().toLowerCase();

export const POST = async (request: NextRequest) => {
  const payload = (await request.json().catch(() => null)) as LoginPayload | null;

  if (!payload || typeof payload.login !== "string" || typeof payload.password !== "string") {
    return NextResponse.json({ error: "Укажите логин и пароль" }, { status: 400 });
  }

  const login = normalizeLogin(payload.login);
  const password = payload.password.trim();

  if (!login || !password) {
    return NextResponse.json({ error: "Укажите логин и пароль" }, { status: 400 });
  }

  await ensureDefaultUsers();

  const user = await prisma.user.findFirst({
    where: {
      login: {
        equals: payload.login.trim(),
        mode: "insensitive"
      }
    }
  });

  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const { token, expiresAt } = createSession(user.id);
  const sessionUser: SessionUser = {
    id: user.id,
    login: user.login,
    role: user.role === "accountant" ? "accountant" : "user"
  };
  const response = NextResponse.json({ user: sessionUser });

  setSessionCookie(response, token, expiresAt);

  return response;
};
