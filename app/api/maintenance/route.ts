import { NextRequest, NextResponse } from "next/server";
import { calculateMaintenance } from "@/lib/maintenance";
import { getProfile, upsertProfile, ensureMigrated } from "@/lib/db";
import { pickMode } from "@/lib/targets";

export async function GET(req: NextRequest) {
  await ensureMigrated();
  const url = new URL(req.url);
  const days = Math.max(7, Math.min(120, parseInt(url.searchParams.get("days") || "30") || 30));
  const result = await calculateMaintenance(days);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const maintenance = parseInt(body.maintenance_kcal);
  if (!maintenance || maintenance < 1200 || maintenance > 5000) {
    return NextResponse.json({ error: "maintenance_kcal must be between 1200 and 5000" }, { status: 400 });
  }
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 400 });

  const mode = pickMode(
    profile.weight_kg ?? 0,
    profile.goal_weight_kg,
    profile.body_fat_pct ?? 0,
    profile.goal_body_fat_pct,
  );
  const deficitByMode: Record<string, number> = { cut: 500, recomp: 250, maintain: 0, bulk: -250 };
  const deficit = deficitByMode[mode] ?? 250;
  const newCalorieTarget = Math.round((maintenance - deficit) / 10) * 10;

  await upsertProfile({ calorie_target: newCalorieTarget });
  return NextResponse.json({
    ok: true,
    mode,
    deficit_applied: deficit,
    new_calorie_target: newCalorieTarget,
    profile: await getProfile(),
  });
}
