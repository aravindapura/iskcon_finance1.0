import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_USER, getSessionUser } from "@/lib/auth";

export const GET = async (request: NextRequest) => {
  const user = (await getSessionUser(request)) ?? PUBLIC_USER;

  return NextResponse.json({ user });
};
