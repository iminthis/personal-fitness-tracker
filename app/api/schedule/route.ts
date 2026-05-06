import { NextRequest, NextResponse } from "next/server";
import { sql, ensureMigrated } from "@/lib/db";
import { buildCalendar, recommendNextSession } from "@/lib/schedule";

function dayKeyUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  await ensureMigrated();
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const today = dateParam ? new Date(dateParam + "T12:00:00Z") : new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 7);
  const end = new Date(today);
  end.setDate(end.getDate() + 7);

  const startISO = dayKeyUTC(start);
  const endISO = dayKeyUTC(end);

  const rows = (await sql`
    SELECT id, date, type, template_key, duration_min, intensity FROM workout
    WHERE date BETWEEN ${startISO} AND ${endISO} AND hidden = 0
    ORDER BY date ASC, id ASC
  `) as Array<{
    id: number;
    date: string;
    type: string;
    template_key: string | null;
    duration_min: number | null;
    intensity: string | null;
  }>;

  const byDate: Record<string, typeof rows> = {};
  for (const r of rows) (byDate[r.date] ??= []).push(r);

  const calendar = buildCalendar({
    today,
    daysBack: 7,
    daysAhead: 7,
    workoutsByDate: byDate,
  });

  const recommendation = recommendNextSession(calendar);
  return NextResponse.json({ calendar, recommendation });
}
