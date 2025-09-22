import { NextResponse } from "next/server";
import { loadSettings } from "@/lib/settingsService";

export const GET = async () => NextResponse.json(await loadSettings());

export const PATCH = async () =>
  NextResponse.json(
    { error: "Ручное обновление курсов отключено" },
    { status: 405, headers: { Allow: "GET" } }
  );
