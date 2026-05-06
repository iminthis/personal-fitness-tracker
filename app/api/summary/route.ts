import { NextResponse } from "next/server";
import { sql, getProfile, todayISO, ensureMigrated } from "@/lib/db";
import { computeFlags } from "@/lib/redFlags";

export async function GET() {
  await ensureMigrated();
  const profile = await getProfile();
  const today = todayISO();

  const todayTotalsRows = (await sql`
    SELECT COALESCE(SUM(calories), 0)::int AS calories,
           COALESCE(SUM(protein_g), 0)::int AS protein_g
    FROM food_entry WHERE date = ${today}
  `) as Array<{ calories: number; protein_g: number }>;
  const todayTotals = todayTotalsRows[0] ?? { calories: 0, protein_g: 0 };

  const last30 = (await sql`
    WITH dates AS (
      SELECT to_char(d, 'YYYY-MM-DD') AS date
      FROM generate_series(
        (CURRENT_DATE - INTERVAL '29 days')::date,
        CURRENT_DATE::date,
        '1 day'::interval
      ) AS d
    )
    SELECT d.date,
      COALESCE((SELECT SUM(calories) FROM food_entry f WHERE f.date = d.date), 0)::int AS calories,
      COALESCE((SELECT SUM(protein_g) FROM food_entry f WHERE f.date = d.date), 0)::int AS protein_g,
      (SELECT weight_kg FROM daily_log dl WHERE dl.date = d.date) AS weight_kg,
      COALESCE((SELECT COUNT(*) FROM workout w WHERE w.date = d.date AND w.hidden = 0), 0)::int AS workouts,
      (SELECT score FROM whoop_recovery wr WHERE wr.date = d.date) AS recovery,
      (SELECT hrv_rmssd_ms FROM whoop_recovery wr WHERE wr.date = d.date) AS hrv,
      (SELECT resting_hr FROM whoop_recovery wr WHERE wr.date = d.date) AS rhr,
      (SELECT duration_min FROM whoop_sleep ws WHERE ws.date = d.date) AS sleep_min,
      (SELECT strain FROM whoop_cycle wc WHERE wc.date = d.date) AS strain
    FROM dates d
    ORDER BY d.date ASC
  `) as Array<any>;

  const todayWorkouts = await sql`
    SELECT * FROM workout WHERE date = ${today} AND hidden = 0 ORDER BY id DESC
  `;
  const todayFoods = await sql`
    SELECT * FROM food_entry WHERE date = ${today} ORDER BY id DESC
  `;

  const tokenRows = (await sql`SELECT 1 FROM whoop_token WHERE id = 1`) as any[];
  const whoopConnected = tokenRows.length > 0;

  const flags = whoopConnected
    ? computeFlags(last30, profile?.protein_target_g ?? 175, profile?.calorie_target ?? 2270)
    : [];

  return NextResponse.json({
    profile,
    today,
    todayTotals,
    todayFoods,
    todayWorkouts,
    last30,
    whoopConnected,
    flags,
  });
}
