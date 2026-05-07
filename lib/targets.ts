export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function leanMassKg(weightKg: number, bodyFatPct: number) {
  return weightKg * (1 - bodyFatPct / 100);
}

export function bmrKatchMcArdle(weightKg: number, bodyFatPct: number) {
  return 370 + 21.6 * leanMassKg(weightKg, bodyFatPct);
}

export function tdee(weightKg: number, bodyFatPct: number, activity: ActivityLevel) {
  return bmrKatchMcArdle(weightKg, bodyFatPct) * ACTIVITY_MULT[activity];
}

export type Mode = "cut" | "recomp" | "maintain" | "bulk";

export function pickMode(currentKg: number, goalKg: number | null | undefined, currentBf: number, goalBf: number | null | undefined): Mode {
  const goalLower = goalBf != null && goalBf < currentBf - 0.5;
  if (!goalKg) return goalLower ? "cut" : "maintain";
  const dropPct = (currentKg - goalKg) / currentKg;
  if (dropPct > 0.03) return "cut";
  if (dropPct < -0.03) return "bulk";
  return goalLower ? "recomp" : "maintain";
}

export function suggestTargets(opts: {
  weightKg: number;
  bodyFatPct: number;
  goalBodyFatPct: number;
  goalWeightKg?: number | null;
  activity: ActivityLevel;
}) {
  const t = tdee(opts.weightKg, opts.bodyFatPct, opts.activity);
  const mode = pickMode(opts.weightKg, opts.goalWeightKg, opts.bodyFatPct, opts.goalBodyFatPct);
  const deficitByMode: Record<Mode, number> = { cut: 500, recomp: 250, maintain: 0, bulk: -250 };
  const deficit = deficitByMode[mode];
  const calories = Math.round((t - deficit) / 10) * 10;
  const proteinAnchorKg = Math.max(opts.weightKg, opts.goalWeightKg ?? 0);
  const proteinPerLbByMode: Record<Mode, number> = { cut: 1.1, recomp: 1.15, maintain: 0.9, bulk: 0.9 };
  const proteinG = Math.round((proteinAnchorKg * 2.20462 * proteinPerLbByMode[mode]) / 5) * 5;
  return {
    calories,
    proteinG,
    tdee: Math.round(t),
    bmr: Math.round(bmrKatchMcArdle(opts.weightKg, opts.bodyFatPct)),
    mode,
  };
}

export function lbToKg(lb: number) { return lb * 0.453592; }
export function kgToLb(kg: number) { return kg / 0.453592; }
export function inToCm(inches: number) { return inches * 2.54; }
