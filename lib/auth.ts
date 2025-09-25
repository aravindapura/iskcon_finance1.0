import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import type { SessionUser, UserRole } from "@/lib/types";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE_NAME = "iskcon_session";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "iskcon-finance-secret";

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");

const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (payload: string) =>
  createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");

const safeEqual = (a: string, b: string) => {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  try {
    return timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
};

const toSessionUser = async (userId: string): Promise<SessionUser | null> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return null;
  }

  return { id: user.id, login: user.login, role: user.role as UserRole };
};

export const createSession = (userId: string) => {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}:${expiresAt}`;
  const signature = sign(payload);
  const token = encode(`${payload}:${signature}`);

  return { token, expiresAt };
};

export const destroySession = (_token: string) => {
  // session данные теперь хранятся только в cookie, поэтому
  // достаточно очистить cookie на стороне клиента
};

export const getSessionUser = async (
  request: NextRequest
): Promise<SessionUser | null> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  let decoded: string;

  try {
    decoded = decode(token);
  } catch {
    return null;
  }

  const [userId, expiresAtRaw, signature] = decoded.split(":");

  if (!userId || !expiresAtRaw || !signature) {
    return null;
  }

  const payload = `${userId}:${expiresAtRaw}`;
  const expectedSignature = sign(payload);

  if (!safeEqual(expectedSignature, signature)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  const user = await toSessionUser(userId);

  if (!user) {
    return null;
  }

  return user;
};

export const setSessionCookie = (response: NextResponse, token: string, expiresAt: number) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
};

type AuthResult =
  | { user: SessionUser; response?: undefined }
  | { user?: undefined; response: NextResponse };

const unauthorizedResponse = () =>
  NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

const forbiddenResponse = () =>
  NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });

export const ensureAuthenticated = async (
  request: NextRequest
): Promise<AuthResult> => {
  const user = await getSessionUser(request);

  if (!user) {
    return { response: unauthorizedResponse() };
  }

  return { user };
};

export const ensureRole = async (
  request: NextRequest,
  allowedRole: UserRole
): Promise<AuthResult> => {
  const auth = await ensureAuthenticated(request);

  if (auth.response) {
    return auth;
  }

  if (auth.user.role !== allowedRole) {
    return { response: forbiddenResponse() };
  }

  return auth;
};

export const ensureAccountant = (request: NextRequest): Promise<AuthResult> =>
  ensureRole(request, "admin");
