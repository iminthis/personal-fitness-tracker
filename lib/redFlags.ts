export type FlagSeverity = "alert" | "warn" | "info";

export type Flag = {
  severity: FlagSeverity;
  title: string;
  detail: string;
  action?: string;
};

export type DayRow = {
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
};

function avg(xs: number[]) {
  if (!xs.length) return null;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function lastN<T>(arr: T[], n: number) {
  return arr.slice(-n);
}
function nonNull<T>(arr: (T | null | undefined)[]) {
  return arr.filter((x): x is T => x != null);
}
function trendSlope(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const xs = values.map((_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function computeFlags(rows30: DayRow[], proteinTarget: number, calorieTarget: number): Flag[] {
  const flags: Flag[] = [];
  const sorted = [...rows30].sort((a, b) => a.date.localeCompare(b.date));
  const last7 = lastN(sorted, 7);
  const last3 = lastN(sorted, 3);

  const todayRow = sorted[sorted.length - 1];
  const yesterdayRow = sorted[sorted.length - 2];

  if (todayRow?.recovery != null && todayRow.recovery < 34) {
    flags.push({
      severity: "warn",
      title: `Recovery red — ${todayRow.recovery}%`,
      detail: "Whoop recovery is in the red zone today.",
      action: "Swap today for Z2 row, mobility, or full rest. Don't push heavy lifts.",
    });
  }

  if (
    todayRow?.recovery != null &&
    yesterdayRow?.recovery != null &&
    todayRow.recovery < 34 &&
    yesterdayRow.recovery < 34
  ) {
    flags.push({
      severity: "alert",
      title: "Two reds in a row",
      detail: `Recovery has been <34% for 2 consecutive days (${yesterdayRow.recovery}% → ${todayRow.recovery}%).`,
      action: "Take a full rest day. Sleep, hydrate, eat to maintenance. No HIIT.",
    });
  }

  const recoveryVals7 = nonNull(last7.map((r) => r.recovery));
  const avgRec7 = avg(recoveryVals7);
  if (avgRec7 != null && recoveryVals7.length >= 4 && avgRec7 < 50) {
    flags.push({
      severity: "alert",
      title: `7-day recovery average ${avgRec7.toFixed(0)}%`,
      detail: "You're under-recovering on a weekly basis.",
      action: "Deload week: drop weights 20%, cut a lift day, prioritize sleep. Recomp won't happen on this trajectory.",
    });
  }

  const rhrPrior = nonNull(sorted.slice(-17, -3).map((r) => r.rhr));
  const rhrRecent = nonNull(last3.map((r) => r.rhr));
  const rhrPriorAvg = avg(rhrPrior);
  const rhrRecentAvg = avg(rhrRecent);
  if (
    rhrPriorAvg != null &&
    rhrRecentAvg != null &&
    rhrRecent.length >= 2 &&
    rhrRecentAvg - rhrPriorAvg >= 5
  ) {
    flags.push({
      severity: "warn",
      title: `Resting HR up ${(rhrRecentAvg - rhrPriorAvg).toFixed(1)} bpm`,
      detail: `3-day RHR ${rhrRecentAvg.toFixed(0)} vs baseline ${rhrPriorAvg.toFixed(0)} bpm.`,
      action: "Common signs: elevated stress, illness brewing, or accumulated training fatigue. Take an easy day and watch.",
    });
  }

  const hrv7 = nonNull(last7.map((r) => r.hrv));
  if (hrv7.length >= 5) {
    const slope = trendSlope(hrv7);
    const meanHrv = avg(hrv7)!;
    if (slope < -1 && Math.abs(slope) / meanHrv > 0.015) {
      flags.push({
        severity: "warn",
        title: "HRV trending down",
        detail: `7-day HRV slope is ${slope.toFixed(2)} ms/day (mean ${meanHrv.toFixed(0)} ms).`,
        action: "Body is shifting toward sympathetic dominance. Add a Z2 day or take an extra rest day this week.",
      });
    }
  }

  const sleep7 = nonNull(last7.map((r) => r.sleep_min));
  const avgSleep7 = avg(sleep7);
  if (avgSleep7 != null && sleep7.length >= 4 && avgSleep7 < 7 * 60) {
    flags.push({
      severity: "warn",
      title: `Sleep averaging ${(avgSleep7 / 60).toFixed(1)}h`,
      detail: "5-day lifting + cardio + <7h sleep = muscle loss, not gain.",
      action: "Earlier bedtime by 30 min. Sleep is the single biggest recomp lever.",
    });
  }

  const highStrainOnLowRec = last3.filter(
    (r) => r.strain != null && r.recovery != null && r.strain >= 15 && r.recovery < 50,
  );
  if (highStrainOnLowRec.length >= 2) {
    flags.push({
      severity: "warn",
      title: "Hammering while tired",
      detail: `${highStrainOnLowRec.length} of last 3 days had strain ≥15 with recovery <50.`,
      action: "Pull intensity back. Strain on low recovery days digs the hole deeper.",
    });
  }

  const last4Workouts = sorted.slice(-4).reduce((s, r) => s + r.workouts, 0);
  if (last4Workouts === 0 && sorted.length >= 4) {
    flags.push({
      severity: "info",
      title: "No workouts in 4+ days",
      detail: "Consistency is the multiplier. If you're traveling or sick, ignore this.",
    });
  }

  const loggedDays = last7.filter((r) => r.calories > 0 || r.protein_g > 0);
  if (loggedDays.length >= 4) {
    const proteinHits = loggedDays.filter((r) => r.protein_g >= proteinTarget * 0.85).length;
    if (proteinHits <= Math.floor(loggedDays.length / 3)) {
      flags.push({
        severity: "warn",
        title: `Protein low: ${proteinHits}/${loggedDays.length} logged days`,
        detail: `Only ${proteinHits} of ${loggedDays.length} logged days hit ≥85% of your ${proteinTarget}g target.`,
        action: "Without protein, the lifting + deficit costs you muscle. Add a shake or eggs to anchor your low days.",
      });
    }
  } else if (last7.length >= 5 && loggedDays.length <= 1) {
    flags.push({
      severity: "info",
      title: "Food logging is sparse",
      detail: `Only ${loggedDays.length} of last 7 days have food logged.`,
      action: "Even rough numbers help — log meals as you eat them, not at the end of the day.",
    });
  }

  return flags;
}
