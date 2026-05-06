import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { ensureMigrated, getProfile, upsertProfile } from "../lib/db";
import { lbToKg, inToCm, suggestTargets } from "../lib/targets";

async function main() {
  await ensureMigrated();
  const existing = await getProfile();
  if (!existing) {
    const weightKg = lbToKg(173.7);
    const heightCm = inToCm(73);
    const bf = 27.2;
    const goalBf = 15;
    const goalWeightKg = lbToKg(175);
    const t = suggestTargets({
      weightKg,
      bodyFatPct: bf,
      goalBodyFatPct: goalBf,
      goalWeightKg,
      activity: "active",
    });
    await upsertProfile({
      name: "Vinay",
      sex: "male",
      age: 19,
      height_cm: Math.round(heightCm * 10) / 10,
      weight_kg: Math.round(weightKg * 10) / 10,
      body_fat_pct: bf,
      goal_body_fat_pct: goalBf,
      goal_weight_kg: Math.round(goalWeightKg * 10) / 10,
      activity_level: "active",
      calorie_target: t.calories,
      protein_target_g: 200,
    });
    console.log("Seeded profile:", { ...t, protein_target_g: 200 });
  } else {
    console.log("Profile already exists, skipping seed");
  }
  console.log("DB ready");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
