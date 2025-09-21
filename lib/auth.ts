import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/operationsStore";
import type { SessionUser, UserRole } from "@/lib/types";

type SessionRecord = {
  userId: string;
  expiresAt: number;
};

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE_NAME = "iskcon_session";

const sessions = new Map<string, SessionRecord>();

const isSessionExpired = (record: SessionRecord) => record.expiresAt <= Date.now();

const toSessionUser = (userId: string): SessionUser | null => {
  const user = db.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  return { id: user.id, login: user.login, role: user.role };
};

export const createSession = (userId: string) => {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;

  sessions.set(token, { userId, expiresAt });

  return { token, expiresAt };
};

export const destroySession = (token: string) => {
  sessions.delete(token);
};

export const getSessionUser = (request: NextRequest): SessionUser | null => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const record = sessions.get(token);

  if (!record) {
    return null;
  }

  if (isSessionExpired(record)) {
    sessions.delete(token);
    return null;
  }

  const user = toSessionUser(record.userId);

  if (!user) {
    sessions.delete(token);
    return null;
  }

  record.expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, record);

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

export const ensureAuthenticated = (request: NextRequest): AuthResult => {
  const user = getSessionUser(request);

  if (!user) {
    return { response: unauthorizedResponse() };
  }

  return { user };
};

export const ensureRole = (
  request: NextRequest,
  allowedRole: UserRole
): AuthResult => {
  const auth = ensureAuthenticated(request);

  if (auth.response) {
    return auth;
  }

  if (auth.user.role !== allowedRole) {
    return { response: forbiddenResponse() };
  }

  return auth;
};

export const ensureAccountant = (request: NextRequest): AuthResult =>
  ensureRole(request, "accountant");
