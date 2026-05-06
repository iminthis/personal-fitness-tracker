import Anthropic from "@anthropic-ai/sdk";
import { sql, getProfile, ensureMigrated } from "./db";

export type InsightContext = {
  profile: Awaited<ReturnType<typeof getProfile>>;
  recentDays: Array<{
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
};

export async function buildContext(days = 14): Promise<InsightContext> {
  await ensureMigrated();
  const profile = await getProfile();
  const rows = (await sql`
    WITH dates AS (
      SELECT to_char(d, 'YYYY-MM-DD') AS date
      FROM generate_series(
        (CURRENT_DATE - ((${days - 1})::int || ' days')::interval)::date,
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
    ORDER BY d.date DESC
  `) as InsightContext["recentDays"];
  return { profile, recentDays: rows };
}

export async function generateInsights(): Promise<{ markdown: string; tokensUsed: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      markdown:
        "**No Anthropic API key set.** Add `ANTHROPIC_API_KEY` to your environment to enable AI coaching insights.",
      tokensUsed: 0,
    };
  }

  const ctx = await buildContext(14);
  const client = new Anthropic({ apiKey });

  const sys = `You are a concise, data-driven fitness coach. Respond in markdown with three short sections:
1. **What's working** (1-2 bullets)
2. **What to fix** (1-3 bullets, specific and actionable)
3. **This week's focus** (1 bullet, single concrete change)
Keep total response under 200 words. Reference the user's actual numbers. No fluff.`;

  const goalWeight = ctx.profile?.goal_weight_kg ? `${ctx.profile.goal_weight_kg.toFixed(1)} kg` : "no preference";
  const userMsg = `Profile:
- Weight: ${ctx.profile?.weight_kg} kg, Height: ${ctx.profile?.height_cm} cm, Body fat: ${ctx.profile?.body_fat_pct}%
- Goal: ${ctx.profile?.goal_body_fat_pct}% body fat at ${goalWeight} (recomp if goal weight ≈ current)
- Daily targets: ${ctx.profile?.calorie_target} kcal, ${ctx.profile?.protein_target_g}g protein
- Activity: ${ctx.profile?.activity_level}

Last 14 days (most recent first):
${ctx.recentDays
  .map(
    (r) =>
      `${r.date} | kcal=${r.calories} | protein=${r.protein_g}g | wt=${r.weight_kg ?? "-"}kg | workouts=${r.workouts} | recovery=${r.recovery ?? "-"} | hrv=${r.hrv ?? "-"} | rhr=${r.rhr ?? "-"} | sleep=${r.sleep_min ?? "-"}min | strain=${r.strain ?? "-"}`,
  )
  .join("\n")}

Give actionable feedback.`;

  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: sys,
    messages: [{ role: "user", content: userMsg }],
  });
  const text = resp.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
  const tokens = (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0);
  return { markdown: text, tokensUsed: tokens };
}
