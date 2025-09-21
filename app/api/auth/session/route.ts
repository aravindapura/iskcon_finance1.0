import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const GET = (request: NextRequest) => {
  const user = getSessionUser(request);

  return NextResponse.json({ user: user ?? null });
};
