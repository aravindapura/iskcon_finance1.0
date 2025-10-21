import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { UserRole } from "@/lib/types";

const PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
const PASSWORD_LENGTH = 10;

export const PASSWORD_MIN_LENGTH = 8;

let ensureUsersTablePromise: Promise<void> | null = null;

const USERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "users" (
    id UUID PRIMARY KEY,
    role TEXT NOT NULL,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP(6) DEFAULT NOW()
  )
`;

const ensureUsersTableOnce = async () => {
  try {
    await prisma.user.count();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      await prisma.$executeRawUnsafe(USERS_TABLE_SQL);
      return;
    }

    throw error;
  }
};

export const ensureUsersTable = async () => {
  if (!ensureUsersTablePromise) {
    ensureUsersTablePromise = ensureUsersTableOnce().catch((error) => {
      ensureUsersTablePromise = null;
      throw error;
    });
  }

  return ensureUsersTablePromise;
};

export const createRandomPassword = () => {
  let result = "";

  for (let index = 0; index < PASSWORD_LENGTH; index += 1) {
    const position = randomInt(0, PASSWORD_CHARSET.length);
    result += PASSWORD_CHARSET[position];
  }

  return result;
};

export const isValidUserRole = (value: unknown): value is UserRole =>
  value === "user" || value === "admin";
