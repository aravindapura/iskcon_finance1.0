import bcrypt from "bcrypt";
import { NextResponse, type NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { SessionUser, UserRole } from "@/lib/types";

type LoginPayload = {
  login?: string;
  password?: string;
};

export const POST = async (request: NextRequest) => {
  try {
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
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    let matches = false;

    // проверка bcrypt
    if (user.password.startsWith("$2")) {
      matches = await bcrypt.compare(password, user.password);
    } else if (user.password === password) {
      // старый пароль в открытом виде → обновляем на bcrypt
      const nextHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: nextHash },
      });
      matches = true;
    }

    if (!matches) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    // создаём сессию
    const { token, expiresAt } = createSession(user.id);

    const sessionUser: SessionUser = {
      id: user.id,
      login: user.login,
      role: user.role as UserRole,
    };

    // ✅ Теперь возвращаем и токен, и юзера
    const response = NextResponse.json({ token, user: sessionUser });

    // Ставим cookie для веба
    setSessionCookie(response, token, expiresAt);

    return response;
  } catch (err: any) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(err) },
      { status: 500 }
    );
  }
};
