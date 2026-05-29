import { NextResponse } from "next/server";
import { sql, ensureMigrated } from "@/lib/db";

export async function GET() {
  await ensureMigrated();
  const rows = (await sql`
    SELECT date, strain, kilojoule, raw
    FROM whoop_cycle
    WHERE date >= (CURRENT_DATE - INTERVAL '6 days')::text
    ORDER BY date DESC
  `) as Array<{ date: string; strain: number | null; kilojoule: number | null; raw: string }>;

  const tzShift = (iso: string, tzo: string) => {
    const m = tzo.match(/^([+-])(\d{2}):?(\d{2})$/);
    if (!m) return iso.slice(0, 16);
    const sign = m[1] === "-" ? -1 : 1;
    const off = sign * (parseInt(m[2]) * 60 + parseInt(m[3]));
    return new Date(new Date(iso).getTime() + off * 60000).toISOString().slice(0, 16);
  };

  const out = rows.map((r) => {
    const raw = JSON.parse(r.raw);
    const tzo = raw.timezone_offset ?? "+00:00";
    const startLocal = raw.start ? tzShift(raw.start, tzo) : null;
    const endLocal = raw.end ? tzShift(raw.end, tzo) : null;
    const startMs = raw.start ? new Date(raw.start).getTime() : Date.now();
    const endMs = raw.end ? new Date(raw.end).getTime() : Date.now();
    const midpoint = new Date((startMs + endMs) / 2).toISOString();
    const midpointLocal = tzShift(midpoint, tzo);
    return {
      stored_date: r.date,
      strain: r.strain,
      kcal: r.kilojoule ? Math.round(r.kilojoule * 0.239006) : null,
      start_local: startLocal,
      end_local: endLocal,
      midpoint_local: midpointLocal,
      tzo,
    };
  });
  return NextResponse.json(out);
}
