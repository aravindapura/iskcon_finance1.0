import { randomInt } from "node:crypto";
import type { UserRole } from "@/lib/types";

const PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
const PASSWORD_LENGTH = 10;

export const PASSWORD_MIN_LENGTH = 8;

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
