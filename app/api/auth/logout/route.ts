import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, clearSessionCookie, destroySession } from "@/lib/auth";

export const POST = (request: NextRequest) => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    destroySession(token);
  }

  const response = NextResponse.json({ success: true });

  clearSessionCookie(response, request);

  return response;
};
