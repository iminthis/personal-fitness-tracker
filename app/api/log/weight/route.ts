import { NextRequest, NextResponse } from "next/server";
import { db, todayISO } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const date = body.date || todayISO();
  const weight_kg = body.weight_kg != null ? parseFloat(body.weight_kg) : null;
  const body_fat_pct = body.body_fat_pct != null && body.body_fat_pct !== "" ? parseFloat(body.body_fat_pct) : null;
  const notes = body.notes || null;
  db()
    .prepare(
      `INSERT INTO daily_log (date, weight_kg, body_fat_pct, notes) VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET weight_kg=excluded.weight_kg, body_fat_pct=excluded.body_fat_pct,
         notes=COALESCE(excluded.notes, daily_log.notes), updated_at=CURRENT_TIMESTAMP`,
    )
    .run(date, weight_kg, body_fat_pct, notes);
  return NextResponse.json({ ok: true });
}
