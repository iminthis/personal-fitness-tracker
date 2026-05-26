import { NextResponse } from "next/server";
import { sql, ensureMigrated } from "@/lib/db";

export async function GET() {
  await ensureMigrated();
  const rows = (await sql`
    SELECT date, strain, kilojoule, raw
    FROM whoop_cycle
    WHERE date >= (CURRENT_DATE - INTERVAL '4 days')::text
    ORDER BY date DESC
  `) as Array<{ date: string; strain: number | null; kilojoule: number | null; raw: string }>;

  const out = rows.map((r) => {
    const raw = JSON.parse(r.raw);
    return {
      stored_date: r.date,
      strain: r.strain,
      kilojoule: r.kilojoule,
      raw_start: raw.start,
      raw_end: raw.end,
      raw_created_at: raw.created_at,
      raw_updated_at: raw.updated_at,
      raw_timezone_offset: raw.timezone_offset,
      raw_score_state: raw.score_state,
    };
  });
  return NextResponse.json(out);
}
