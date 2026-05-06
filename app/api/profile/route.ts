import { NextRequest, NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/lib/db";
import { suggestTargets } from "@/lib/targets";

export async function GET() {
  return NextResponse.json({ profile: getProfile() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const profile: any = {
    name: body.name ?? null,
    sex: body.sex ?? null,
    age: body.age ? parseInt(body.age) : null,
    height_cm: body.height_cm ? parseFloat(body.height_cm) : null,
    weight_kg: body.weight_kg ? parseFloat(body.weight_kg) : null,
    body_fat_pct: body.body_fat_pct ? parseFloat(body.body_fat_pct) : null,
    goal_body_fat_pct: body.goal_body_fat_pct ? parseFloat(body.goal_body_fat_pct) : null,
    goal_weight_kg: body.goal_weight_kg ? parseFloat(body.goal_weight_kg) : null,
    activity_level: body.activity_level ?? null,
    calorie_target: body.calorie_target ? parseInt(body.calorie_target) : null,
    protein_target_g: body.protein_target_g ? parseInt(body.protein_target_g) : null,
  };
  if (body.recompute_targets && profile.weight_kg && profile.body_fat_pct && profile.goal_body_fat_pct && profile.activity_level) {
    const t = suggestTargets({
      weightKg: profile.weight_kg,
      bodyFatPct: profile.body_fat_pct,
      goalBodyFatPct: profile.goal_body_fat_pct,
      goalWeightKg: profile.goal_weight_kg,
      activity: profile.activity_level,
    });
    profile.calorie_target = t.calories;
    profile.protein_target_g = t.proteinG;
  }
  upsertProfile(profile);
  return NextResponse.json({ ok: true, profile: getProfile() });
}
