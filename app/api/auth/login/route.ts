
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
  // Временно отключаем авторизацию: всегда возвращаем фиктивного пользователя
  const sessionUser: SessionUser = {
    id: "00000000-0000-0000-0000-000000000001",
    login: "buh",
    role: "admin" as UserRole,
  };
  const { token, expiresAt } = createSession(sessionUser.id);
  const response = NextResponse.json({ token, user: sessionUser });
  setSessionCookie(response, token, expiresAt);
  return response;
};
