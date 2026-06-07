import { sql, ensureMigrated } from "./db";

export type MaintenanceMethod = "energy-balance" | "whoop-burn" | "insufficient";

export type MaintenanceResult = {
  method: MaintenanceMethod;
  maintenance_kcal: number | null;
  days_window: number;
  days_logged: number;
  avg_intake_kcal: number | null;
  avg_whoop_burn_kcal: number | null;
  weight_change_lb: number | null;
  start_weight_lb: number | null;
  end_weight_lb: number | null;
  start_date: string | null;
  end_date: string | null;
  span_days: number | null;
  confidence: "high" | "medium" | "low";
  notes: string[];
};

export async function calculateMaintenance(days = 30): Promise<MaintenanceResult> {
  await ensureMigrated();
  const notes: string[] = [];

  const startISO = (await sql`SELECT to_char(CURRENT_DATE - (${days}::int - 1) * INTERVAL '1 day', 'YYYY-MM-DD') AS d`) as Array<{ d: string }>;
  const windowStart = startISO[0].d;

  const weights = (await sql`
    SELECT date, weight_kg FROM daily_log
    WHERE weight_kg IS NOT NULL AND date >= ${windowStart}
    ORDER BY date ASC
  `) as Array<{ date: string; weight_kg: number }>;

  const intakeRows = (await sql`
    SELECT date, SUM(calories)::int AS cal
    FROM food_entry
    WHERE date >= ${windowStart}
    GROUP BY date
    HAVING SUM(calories) > 0
    ORDER BY date ASC
  `) as Array<{ date: string; cal: number }>;

  const burnRows = (await sql`
    SELECT
      COALESCE(
        (SELECT burn_kcal_override FROM daily_log dl WHERE dl.date = wc.date),
        ROUND(wc.kilojoule * 0.239006)::int
      ) AS burn
    FROM whoop_cycle wc
    WHERE wc.date >= ${windowStart} AND wc.kilojoule IS NOT NULL
  `) as Array<{ burn: number | null }>;

  const validBurns = burnRows.map((r) => r.burn).filter((b): b is number => b != null);
  const avg_whoop_burn_kcal = validBurns.length
    ? Math.round(validBurns.reduce((s, b) => s + b, 0) / validBurns.length)
    : null;
  const avg_intake_kcal = intakeRows.length
    ? Math.round(intakeRows.reduce((s, r) => s + r.cal, 0) / intakeRows.length)
    : null;

  const base = {
    days_window: days,
    days_logged: intakeRows.length,
    avg_intake_kcal,
    avg_whoop_burn_kcal,
  };

  if (weights.length >= 2 && intakeRows.length >= 7) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const span_days = daysBetween(first.date, last.date);

    if (span_days >= 7) {
      const weight_change_kg = last.weight_kg - first.weight_kg;
      const weight_change_lb = weight_change_kg * 2.20462;
      const weight_change_kcal = weight_change_lb * 3500;
      const maintenance = Math.round(avg_intake_kcal! - weight_change_kcal / span_days);

      let confidence: "high" | "medium" | "low" = "high";
      if (span_days < 21) {
        confidence = "medium";
        notes.push(`Only ${span_days} days between first and last weight — water/glycogen noise can skew this. 28+ days gives a more stable read.`);
      }
      if (intakeRows.length < days * 0.6) {
        confidence = confidence === "high" ? "medium" : "low";
        notes.push(`Only ${intakeRows.length} of ${days} days had food logged — the intake average assumes unlogged days were similar.`);
      }
      if (Math.abs(weight_change_lb) < 1 && span_days < 30) {
        notes.push("Weight change is under 1 lb — could be noise. Result is your maintenance plus/minus ~100 kcal.");
      }
      if (avg_whoop_burn_kcal && Math.abs(maintenance - avg_whoop_burn_kcal) / avg_whoop_burn_kcal > 0.2) {
        notes.push(`Calculated maintenance (${maintenance}) differs from Whoop's average burn (${avg_whoop_burn_kcal}) by >20%. Worth a second look.`);
      }

      return {
        ...base,
        method: "energy-balance",
        maintenance_kcal: maintenance,
        weight_change_lb: round1(weight_change_lb),
        start_weight_lb: round1(first.weight_kg * 2.20462),
        end_weight_lb: round1(last.weight_kg * 2.20462),
        start_date: first.date,
        end_date: last.date,
        span_days,
        confidence,
        notes,
      };
    }
    notes.push(`Only ${span_days} days between first and last weight — need at least 7 for energy balance to be meaningful.`);
  } else {
    if (weights.length < 2) notes.push(`Only ${weights.length} weight(s) logged in last ${days} days — need at least 2 to compute energy balance.`);
    if (intakeRows.length < 7) notes.push(`Only ${intakeRows.length} day(s) of food logged — need ≥7 for a usable average.`);
  }

  if (avg_whoop_burn_kcal) {
    notes.push("Falling back to average Whoop daily expenditure. Whoop tends to undercount NEAT — real maintenance is likely 100-300 kcal higher.");
    return {
      ...base,
      method: "whoop-burn",
      maintenance_kcal: avg_whoop_burn_kcal,
      weight_change_lb: null,
      start_weight_lb: null,
      end_weight_lb: null,
      start_date: null,
      end_date: null,
      span_days: null,
      confidence: "low",
      notes,
    };
  }

  return {
    ...base,
    method: "insufficient",
    maintenance_kcal: null,
    weight_change_lb: null,
    start_weight_lb: null,
    end_weight_lb: null,
    start_date: null,
    end_date: null,
    span_days: null,
    confidence: "low",
    notes,
  };
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / 86_400_000);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
