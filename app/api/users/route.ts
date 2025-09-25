import { randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import prisma from "@/lib/prisma";

const LOGIN_PREFIX = "user";
const LOGIN_MIN = 1000;
const LOGIN_MAX = 10_000;
const PASSWORD_LENGTH = 10;
const PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

const generatePassword = () => {
  let result = "";

  for (let index = 0; index < PASSWORD_LENGTH; index += 1) {
    const position = randomInt(0, PASSWORD_CHARSET.length);
    result += PASSWORD_CHARSET[position];
  }

  return result;
};

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
    const password = generatePassword();

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
