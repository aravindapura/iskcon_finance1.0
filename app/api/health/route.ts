import { NextResponse } from "next/server";

export const GET = () => {
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
};
