import { NextResponse, type NextRequest } from "next/server";

export const GET = async (_request: NextRequest) =>
  NextResponse.json(
    { user: null, error: "Модуль авторизации временно отключен" },
    { status: 503 }
  );

/*
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const GET = async (request: NextRequest) => {
  const user = await getSessionUser(request);

  return NextResponse.json({ user: user ?? null });
};
*/
