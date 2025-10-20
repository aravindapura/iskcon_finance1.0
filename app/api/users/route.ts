import { randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createRandomPassword } from "@/lib/users";

const LOGIN_PREFIX = "user";
const LOGIN_MIN = 1000;
const LOGIN_MAX = 10_000;

const generateCandidateLogin = () =>
  `${LOGIN_PREFIX}${randomInt(LOGIN_MIN, LOGIN_MAX)}`;

const generateUniqueLogin = async (): Promise<string> => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateCandidateLogin();
    const existing = await prisma.user.findUnique({ where: { login: candidate } });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Не удалось сгенерировать уникальный логин");
};

export const POST = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  try {
    const login = await generateUniqueLogin();
    const password = createRandomPassword();

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        id: randomUUID(),
        login,
        role: "user",
        password: hash
      }
    });

    return NextResponse.json({ login, password });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось создать пользователя";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const GET = async (request: NextRequest) => {
  const auth = await ensureAccountant(request);

  if (auth.response) {
    return auth.response;
  }

  try {
    const users = await prisma.user.findMany({
      select: { id: true, login: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        login: user.login,
        role: user.role,
        createdAt: user.createdAt ? user.createdAt.toISOString() : null
      }))
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось получить список пользователей";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
