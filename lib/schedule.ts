import { findTemplate, WORKOUT_TEMPLATES } from "./workoutPlan";

export const WEEKDAY_PLAN: Record<number, string> = {
  0: "active_recovery",
  1: "push",
  2: "pull",
  3: "legs_squat",
  4: "upper",
  5: "legs_dl",
  6: "z2_row",
};

export const TEMPLATE_MUSCLE_GROUPS: Record<string, string[]> = {
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps", "rear-delts"],
  legs_squat: ["quads", "glutes", "core"],
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  legs_dl: ["hamstrings", "glutes", "back", "core"],
  z2_row: ["cardio"],
  active_recovery: [],
};

const SPORT_TO_TEMPLATE: Record<string, string> = {
  weightlifting: "lifting",
  rowing: "z2_row",
  running: "z2_row",
  cycling: "z2_row",
};

export function dayKey(d: Date): string {
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60 * 1000).toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function classifyWorkout(w: { type: string; template_key?: string | null }): string | null {
  if (w.template_key) return w.template_key;
  const t = (w.type || "").toLowerCase();
  return SPORT_TO_TEMPLATE[t] ?? null;
}

export type CalendarDay = {
  date: string;
  weekday: number;
  weekdayName: string;
  isPast: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  suggestedKey: string | null;
  suggestedName: string | null;
  loggedWorkouts: Array<{
    id: number;
    type: string;
    template_key: string | null;
    duration_min: number | null;
    intensity: string | null;
  }>;
  inferredKey: string | null;
};

export function buildCalendar(opts: {
  today: Date;
  daysBack: number;
  daysAhead: number;
  workoutsByDate: Record<string, CalendarDay["loggedWorkouts"]>;
}): CalendarDay[] {
  const out: CalendarDay[] = [];
  const todayKey = dayKey(opts.today);
  for (let i = -opts.daysBack; i <= opts.daysAhead; i++) {
    const d = addDays(opts.today, i);
    const key = dayKey(d);
    const weekday = d.getDay();
    const logged = opts.workoutsByDate[key] ?? [];
    const liftLog = logged.find((w) => classifyWorkout(w) && classifyWorkout(w) !== "z2_row");
    const inferredKey = liftLog ? classifyWorkout(liftLog) : logged.length > 0 ? "z2_row" : null;
    const isPast = i < 0;
    const suggestedKey = isPast ? null : WEEKDAY_PLAN[weekday];
    out.push({
      date: key,
      weekday,
      weekdayName: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday],
      isPast,
      isToday: key === todayKey,
      isTomorrow: i === 1,
      suggestedKey,
      suggestedName: suggestedKey ? findTemplate(suggestedKey)?.name ?? null : null,
      loggedWorkouts: logged,
      inferredKey,
    });
  }
  return out;
}

const PRIMARY_LIFTS = ["pull", "push", "legs_squat", "upper", "legs_dl"];

export function recommendNextSession(calendar: CalendarDay[]): {
  date: string;
  key: string;
  name: string;
  reason: string;
} {
  const past5 = calendar.filter((d) => d.isPast || d.isToday).slice(-5);
  const recentKeys = past5
    .map((d) => d.inferredKey)
    .filter((k): k is string => k != null);

  const lastTrainedDay: Record<string, number> = {};
  past5.forEach((d, idx) => {
    if (d.inferredKey) lastTrainedDay[d.inferredKey] = idx;
  });

  const todayIdx = calendar.findIndex((d) => d.isToday);
  const tomorrow = calendar[todayIdx + 1] ?? calendar[0];
  const consecutive = countConsecutiveTrained(calendar, todayIdx);

  const missing = PRIMARY_LIFTS.filter((k) => !recentKeys.includes(k));

  if (consecutive >= 5 || (consecutive >= 4 && missing.length === 0)) {
    return {
      date: tomorrow.date,
      key: "active_recovery",
      name: "Active recovery",
      reason: `You've trained ${consecutive} days in a row with no fresh muscle group to target. Take a recovery day.`,
    };
  }

  if (missing.length) {
    const next = missing[0];
    const tmpl = findTemplate(next);
    const muscleHit = (TEMPLATE_MUSCLE_GROUPS[next] ?? []).join("/");
    return {
      date: tomorrow.date,
      key: next,
      name: tmpl?.name ?? next,
      reason: `${muscleHit} hasn't been trained in your last ${past5.length} sessions — hit it tomorrow.`,
    };
  }

  const oldest = PRIMARY_LIFTS
    .map((k) => ({ k, idx: lastTrainedDay[k] ?? -1 }))
    .sort((a, b) => a.idx - b.idx)[0];
  const tmpl = findTemplate(oldest.k);
  return {
    date: tomorrow.date,
    key: oldest.k,
    name: tmpl?.name ?? oldest.k,
    reason: "All major groups hit recently — rotate to the one you trained least recently.",
  };
}

function countConsecutiveTrained(cal: CalendarDay[], todayIdx: number): number {
  let n = 0;
  for (let i = todayIdx; i >= 0; i--) {
    const d = cal[i];
    const trained = d.loggedWorkouts.some((w) => {
      const k = w.template_key;
      return k != null && PRIMARY_LIFTS.includes(k);
    });
    if (trained) n++;
    else break;
  }
  return n;
}

export function templateShort(key: string): string {
  return WORKOUT_TEMPLATES.find((t) => t.key === key)?.short ?? key;
}
