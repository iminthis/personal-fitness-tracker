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

    // Sync profile to most-recent weight (and body fat if a fresh BF was provided).
    // Backfilling an old date won't overwrite a more recent profile weight because
    // we look up the latest weight in daily_log, not the just-saved row.
    const latestWeight = (await sql`
      SELECT weight_kg FROM daily_log WHERE weight_kg IS NOT NULL ORDER BY date DESC LIMIT 1
    `) as Array<{ weight_kg: number }>;
    const latestBf = (await sql`
      SELECT body_fat_pct FROM daily_log WHERE body_fat_pct IS NOT NULL ORDER BY date DESC LIMIT 1
    `) as Array<{ body_fat_pct: number }>;

    const profileWeight = latestWeight[0]?.weight_kg ?? null;
    const profileBf = latestBf[0]?.body_fat_pct ?? null;

    if (profileWeight != null) {
      await sql`UPDATE profile SET weight_kg = ${profileWeight}, updated_at = NOW() WHERE id = 1`;
    }
    if (profileBf != null && body_fat_pct != null) {
      // only nudge profile BF when this log included a fresh BF measurement
      await sql`UPDATE profile SET body_fat_pct = ${profileBf}, updated_at = NOW() WHERE id = 1`;
    }

    return NextResponse.json({
      ok: true,
      saved: saved[0],
      profile_synced: {
        weight_kg: profileWeight,
        weight_lb: profileWeight ? Number((profileWeight * 2.20462).toFixed(1)) : null,
        body_fat_pct: body_fat_pct != null ? profileBf : null,
      },
    });
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
