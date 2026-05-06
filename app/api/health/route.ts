import { NextResponse } from "next/server";

export async function GET() {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    WHOOP_CLIENT_ID: !!process.env.WHOOP_CLIENT_ID,
    WHOOP_CLIENT_SECRET: !!process.env.WHOOP_CLIENT_SECRET,
    WHOOP_REDIRECT_URI: process.env.WHOOP_REDIRECT_URI || null,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
  };

  let dbCheck: { ok: boolean; error?: string } = { ok: false };
  try {
    if (process.env.DATABASE_URL) {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL);
      await sql`SELECT 1 AS ping`;
      dbCheck.ok = true;
    } else {
      dbCheck.error = "DATABASE_URL not set";
    }
  } catch (e: any) {
    dbCheck.error = e.message;
  }

  return NextResponse.json({ env, db: dbCheck, runtime: process.version });
}
