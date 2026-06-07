import { NextRequest, NextResponse } from "next/server";
import { sql, todayISO, ensureMigrated } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await ensureMigrated();
    const body = await req.json();
    const date = body.date || todayISO();
    const weight_kg = body.weight_kg != null && body.weight_kg !== "" ? parseFloat(body.weight_kg) : null;
    const body_fat_pct = body.body_fat_pct != null && body.body_fat_pct !== "" ? parseFloat(body.body_fat_pct) : null;
    const notes = body.notes || null;
    if (weight_kg == null && body_fat_pct == null && !notes) {
      return NextResponse.json({ error: "Nothing to save — provide weight, body fat, or notes." }, { status: 400 });
    }
    await sql`
      INSERT INTO daily_log (date, weight_kg, body_fat_pct, notes)
      VALUES (${date}, ${weight_kg}, ${body_fat_pct}, ${notes})
      ON CONFLICT (date) DO UPDATE SET
        weight_kg = COALESCE(EXCLUDED.weight_kg, daily_log.weight_kg),
        body_fat_pct = COALESCE(EXCLUDED.body_fat_pct, daily_log.body_fat_pct),
        notes = COALESCE(EXCLUDED.notes, daily_log.notes),
        updated_at = NOW()
    `;
    const saved = (await sql`SELECT date, weight_kg, body_fat_pct FROM daily_log WHERE date = ${date}`) as any[];
    return NextResponse.json({ ok: true, saved: saved[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  await ensureMigrated();
  const rows = await sql`
    SELECT date, weight_kg, body_fat_pct, notes
    FROM daily_log
    WHERE weight_kg IS NOT NULL OR body_fat_pct IS NOT NULL
    ORDER BY date DESC
    LIMIT 90
  `;
  return NextResponse.json({ rows });
}
