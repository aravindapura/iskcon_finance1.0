// app/api/auth/login/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Временный вход без авторизации
export const POST = async () => {
  const user = {
    id: "00000000-0000-0000-0000-000000000001",
    login: "buh",
    role: "admin",
  };

  return NextResponse.json({
    token: "mock-token",
    user,
  });
};
