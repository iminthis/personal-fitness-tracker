import { NextRequest, NextResponse } from "next/server";
import { sql, todayISO, ensureMigrated } from "@/lib/db";

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const date = body.date || todayISO();
  const weight_kg = body.weight_kg != null ? parseFloat(body.weight_kg) : null;
  const body_fat_pct = body.body_fat_pct != null && body.body_fat_pct !== "" ? parseFloat(body.body_fat_pct) : null;
  const notes = body.notes || null;
  await sql`
    INSERT INTO daily_log (date, weight_kg, body_fat_pct, notes)
    VALUES (${date}, ${weight_kg}, ${body_fat_pct}, ${notes})
    ON CONFLICT (date) DO UPDATE SET
      weight_kg = EXCLUDED.weight_kg,
      body_fat_pct = EXCLUDED.body_fat_pct,
      notes = COALESCE(EXCLUDED.notes, daily_log.notes),
      updated_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}
