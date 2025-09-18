import { NextResponse } from "next/server";

export const GET = () =>
  NextResponse.json({ ok: true, time: new Date().toISOString() });
