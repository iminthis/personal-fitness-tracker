import { db, getProfile, upsertProfile } from "../lib/db";
import { lbToKg, inToCm, suggestTargets } from "../lib/targets";

db();

const existing = getProfile();
if (!existing) {
  const weightKg = lbToKg(176);
  const heightCm = inToCm(73);
  const bf = 27.2;
  const goalBf = 15;
  const t = suggestTargets({ weightKg, bodyFatPct: bf, goalBodyFatPct: goalBf, activity: "moderate" });
  upsertProfile({
    name: "Vinay",
    sex: "male",
    age: 25,
    height_cm: Math.round(heightCm * 10) / 10,
    weight_kg: Math.round(weightKg * 10) / 10,
    body_fat_pct: bf,
    goal_body_fat_pct: goalBf,
    activity_level: "moderate",
    calorie_target: t.calories,
    protein_target_g: t.proteinG,
  });
  console.log("Seeded profile:", { ...t });
} else {
  console.log("Profile already exists, skipping seed");
}

console.log("DB ready at data/fitness.db");
