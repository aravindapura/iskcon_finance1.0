import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const GET = async (request: NextRequest) => {
  const user = await getSessionUser(request);

  return NextResponse.json({ user: user ?? null });
};
