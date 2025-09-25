import { NextResponse, type NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/types";

type LoginPayload = {
  username?: string;
  password?: string;
};

const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const POST = async (request: NextRequest) => {
  const payload = (await request.json().catch(() => null)) as LoginPayload | null;

  if (!payload || typeof payload.username !== "string" || typeof payload.password !== "string") {
    return NextResponse.json({ error: "Укажите логин и пароль" }, { status: 400 });
  }

  const username = normalizeUsername(payload.username);
  const password = payload.password.trim();

  if (!username || !password) {
    return NextResponse.json({ error: "Укажите логин и пароль" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: payload.username.trim(),
        mode: "insensitive"
      }
    }
  });

  if (!user) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

  const [verification] = await prisma.$queryRaw<{ matches: boolean }[]>`
    SELECT crypt(${password}, ${user.passwordHash}) = ${user.passwordHash} AS matches
  `;

  if (!verification?.matches) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const { token, expiresAt } = createSession(user.id);
  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    role: user.role === "admin" ? "admin" : "user"
  };
  const response = NextResponse.json({ user: sessionUser });

  setSessionCookie(response, token, expiresAt);

  return response;
};
