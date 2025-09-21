import { NextResponse } from "next/server";
import { Client } from "pg";

export const GET = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    const result = await client.query("SELECT NOW()");
    const rawTime = result.rows[0]?.now;
    const time = rawTime instanceof Date ? rawTime.toISOString() : String(rawTime ?? "");

    return NextResponse.json({ status: "ok", time });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while querying database";

    return NextResponse.json({ status: "error", message }, { status: 500 });
  } finally {
    await client.end();
  }
};
