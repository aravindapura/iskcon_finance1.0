import bcrypt from "bcrypt";
import { NextResponse, type NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/types";

type LoginPayload = {
  login?: string;
  password?: string;
};

export const POST = async (request: NextRequest) => {
  const payload = (await request.json().catch(() => null)) as LoginPayload | null;

  if (!payload || typeof payload.login !== "string" || typeof payload.password !== "string") {
    return NextResponse.json({ error: "Укажите логин и пароль" }, { status: 400 });
  }

  const login = payload.login.trim();
  const password = payload.password.trim();

  if (!login || !password) {
    return NextResponse.json({ error: "Укажите логин и пароль" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      login: {
        equals: login,
        mode: "insensitive"
      }
    }
  });

  if (!user) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const matches = await bcrypt.compare(password, user.password);

  if (!matches) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const { token, expiresAt } = createSession(user.id);
  const sessionUser: SessionUser = {
    id: user.id,
    login: user.login,
    role: user.role === "admin" ? "admin" : "user"
  };
  const response = NextResponse.json({ user: sessionUser });

  setSessionCookie(response, token, expiresAt);

  return response;
};
