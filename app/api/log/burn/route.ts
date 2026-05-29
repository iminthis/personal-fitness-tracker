import { NextRequest, NextResponse } from "next/server";
import { sql, ensureMigrated, todayISO } from "@/lib/db";

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const date = body.date || todayISO();
  const raw = body.burn_kcal;
  const burn_kcal = raw === null || raw === undefined || raw === "" ? null : Math.max(0, parseInt(raw));
  await sql`
    INSERT INTO daily_log (date, burn_kcal_override)
    VALUES (${date}, ${burn_kcal})
    ON CONFLICT (date) DO UPDATE SET
      burn_kcal_override = EXCLUDED.burn_kcal_override,
      updated_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}
