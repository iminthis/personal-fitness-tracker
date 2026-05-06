import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildCalendar, recommendNextSession } from "@/lib/schedule";

export async function GET() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 7);
  const end = new Date(today);
  end.setDate(end.getDate() + 7);

  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  const rows = db()
    .prepare(
      `SELECT id, date, type, template_key, duration_min, intensity FROM workout
       WHERE date BETWEEN ? AND ? AND hidden = 0 ORDER BY date ASC, id ASC`,
    )
    .all(startISO, endISO) as Array<{
    id: number;
    date: string;
    type: string;
    template_key: string | null;
    duration_min: number | null;
    intensity: string | null;
  }>;

  const byDate: Record<string, typeof rows> = {};
  for (const r of rows) {
    (byDate[r.date] ??= []).push(r);
  }

  const calendar = buildCalendar({
    today,
    daysBack: 7,
    daysAhead: 7,
    workoutsByDate: byDate,
  });

  const recommendation = recommendNextSession(calendar);
  return NextResponse.json({ calendar, recommendation });
}
