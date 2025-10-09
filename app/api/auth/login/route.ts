export const runtime = "nodejs";

import { NextResponse } from "next/server";

export const POST = async () => {
  const user = { id: "0001", login: "buh", role: "admin" };
  return NextResponse.json({ token: "mock-token", user });
};
