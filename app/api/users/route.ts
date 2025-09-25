import { randomInt, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ensureAccountant } from "@/lib/auth";
import prisma from "@/lib/prisma";

const USERNAME_PREFIX = "user";
const USERNAME_MIN = 1000;
const USERNAME_MAX = 10_000;
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

const generateCandidateUsername = () =>
  `${USERNAME_PREFIX}${randomInt(USERNAME_MIN, USERNAME_MAX)}`;

const generateUniqueUsername = async (): Promise<string> => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateCandidateUsername();
    const existing = await prisma.user.findUnique({ where: { username: candidate } });

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
    const username = await generateUniqueUsername();
    const password = generatePassword();

    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

    const [hashRow] = await prisma.$queryRaw<{ hash: string }[]>`
      SELECT crypt(${password}, gen_salt('bf', 12)) AS hash
    `;

    if (!hashRow?.hash) {
      throw new Error("Не удалось создать пользователя");
    }

    await prisma.user.create({
      data: {
        id: randomUUID(),
        username,
        role: "user",
        passwordHash: hashRow.hash
      }
    });

    return NextResponse.json({ username, password });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось создать пользователя";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
