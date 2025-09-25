import { NextResponse, type NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
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

  const { verified, needsRehash } = await verifyPassword(password, user.password);

  if (!verified) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  if (needsRehash) {
    const nextHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: nextHash }
    });
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
