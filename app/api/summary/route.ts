import { NextResponse } from "next/server";
import { db, getProfile, todayISO } from "@/lib/db";
import { computeFlags } from "@/lib/redFlags";

export async function GET() {
  const profile = getProfile();
  const today = todayISO();
  const d = db();

  const todayTotals = d
    .prepare(`SELECT COALESCE(SUM(calories),0) AS calories, COALESCE(SUM(protein_g),0) AS protein_g FROM food_entry WHERE date = ?`)
    .get(today) as { calories: number; protein_g: number };

  const last30 = d
    .prepare(
      `WITH RECURSIVE dates(date, n) AS (
         SELECT date('now','localtime'), 0
         UNION ALL SELECT date(date,'-1 day'), n+1 FROM dates WHERE n < 29
       )
       SELECT d.date,
         COALESCE((SELECT SUM(calories) FROM food_entry f WHERE f.date = d.date), 0) AS calories,
         COALESCE((SELECT SUM(protein_g) FROM food_entry f WHERE f.date = d.date), 0) AS protein_g,
         (SELECT weight_kg FROM daily_log dl WHERE dl.date = d.date) AS weight_kg,
         COALESCE((SELECT COUNT(*) FROM workout w WHERE w.date = d.date AND w.hidden = 0), 0) AS workouts,
         (SELECT score FROM whoop_recovery wr WHERE wr.date = d.date) AS recovery,
         (SELECT hrv_rmssd_ms FROM whoop_recovery wr WHERE wr.date = d.date) AS hrv,
         (SELECT resting_hr FROM whoop_recovery wr WHERE wr.date = d.date) AS rhr,
         (SELECT duration_min FROM whoop_sleep ws WHERE ws.date = d.date) AS sleep_min,
         (SELECT strain FROM whoop_cycle wc WHERE wc.date = d.date) AS strain
       FROM dates d ORDER BY d.date ASC`,
    )
    .all() as Array<{
    date: string;
    calories: number;
    protein_g: number;
    weight_kg: number | null;
    workouts: number;
    recovery: number | null;
    hrv: number | null;
    rhr: number | null;
    sleep_min: number | null;
    strain: number | null;
  }>;

  const todayWorkouts = d
    .prepare(`SELECT * FROM workout WHERE date = ? AND hidden = 0 ORDER BY id DESC`)
    .all(today);
  const todayFoods = d
    .prepare(`SELECT * FROM food_entry WHERE date = ? ORDER BY id DESC`)
    .all(today);

  const whoopConnected =
    (d.prepare(`SELECT 1 FROM whoop_token WHERE id = 1`).get() as any) != null;

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
