"use client";
import { useEffect, useState } from "react";

export default function GoalsPage() {
  const [p, setP] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/profile");
    const j = await r.json();
    if (j.profile && j.profile.weight_kg) j.profile.weight_lb = (j.profile.weight_kg * 2.20462).toFixed(1);
    if (j.profile && j.profile.height_cm) j.profile.height_in = (j.profile.height_cm / 2.54).toFixed(1);
    if (j.profile && j.profile.goal_weight_kg) j.profile.goal_weight_lb = (j.profile.goal_weight_kg * 2.20462).toFixed(1);
    setP(j.profile);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(recompute: boolean) {
    setSaving(true);
    setMsg(null);
    const body = {
      ...p,
      weight_kg: p.weight_lb ? parseFloat(p.weight_lb) / 2.20462 : p.weight_kg,
      height_cm: p.height_in ? parseFloat(p.height_in) * 2.54 : p.height_cm,
      goal_weight_kg: p.goal_weight_lb ? parseFloat(p.goal_weight_lb) / 2.20462 : p.goal_weight_kg,
      recompute_targets: recompute,
    };
    const r = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    setMsg(recompute ? "Targets recomputed and saved." : "Saved.");
    setSaving(false);
    if (j.profile) {
      j.profile.weight_lb = j.profile.weight_kg ? (j.profile.weight_kg * 2.20462).toFixed(1) : "";
      j.profile.height_in = j.profile.height_cm ? (j.profile.height_cm / 2.54).toFixed(1) : "";
      j.profile.goal_weight_lb = j.profile.goal_weight_kg ? (j.profile.goal_weight_kg * 2.20462).toFixed(1) : "";
      setP(j.profile);
    }
  }

  if (!p) return <div className="text-muted text-sm">Loading…</div>;

  const lbm = p.weight_kg && p.body_fat_pct ? p.weight_kg * (1 - p.body_fat_pct / 100) : null;
  const goalWeightKg = p.goal_weight_lb ? parseFloat(p.goal_weight_lb) / 2.20462 : null;

  const cutWeight = lbm && p.goal_body_fat_pct ? lbm / (1 - p.goal_body_fat_pct / 100) : null;
  const cutFatToLose = p.weight_kg && cutWeight ? p.weight_kg - cutWeight : null;
  const cutWeeks = cutFatToLose ? Math.round(cutFatToLose / 0.45) : null;

  const recompTargetLbm = goalWeightKg && p.goal_body_fat_pct ? goalWeightKg * (1 - p.goal_body_fat_pct / 100) : null;
  const recompTargetFatKg = goalWeightKg && p.goal_body_fat_pct ? goalWeightKg * (p.goal_body_fat_pct / 100) : null;
  const currentFatKg = p.weight_kg && p.body_fat_pct ? p.weight_kg * (p.body_fat_pct / 100) : null;
  const muscleToGain = recompTargetLbm && lbm ? recompTargetLbm - lbm : null;
  const fatToLoseRecomp = currentFatKg && recompTargetFatKg ? currentFatKg - recompTargetFatKg : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Goals & Profile</h1>

      <section className="panel p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><span className="label">Name</span><input className="input" value={p.name ?? ""} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
          <div><span className="label">Age</span><input className="input" type="number" value={p.age ?? ""} onChange={(e) => setP({ ...p, age: e.target.value })} /></div>
          <div><span className="label">Sex</span>
            <select className="input" value={p.sex ?? ""} onChange={(e) => setP({ ...p, sex: e.target.value })}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div><span className="label">Activity</span>
            <select className="input" value={p.activity_level ?? "moderate"} onChange={(e) => setP({ ...p, activity_level: e.target.value })}>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light (1-2 sessions/wk)</option>
              <option value="moderate">Moderate (3-5/wk)</option>
              <option value="active">Active (6-7/wk)</option>
              <option value="very_active">Very active (2x/day)</option>
            </select>
          </div>
          <div><span className="label">Height (in)</span><input className="input" type="number" step="0.1" value={p.height_in ?? ""} onChange={(e) => setP({ ...p, height_in: e.target.value })} /></div>
          <div><span className="label">Weight (lb)</span><input className="input" type="number" step="0.1" value={p.weight_lb ?? ""} onChange={(e) => setP({ ...p, weight_lb: e.target.value })} /></div>
          <div><span className="label">Body fat %</span><input className="input" type="number" step="0.1" value={p.body_fat_pct ?? ""} onChange={(e) => setP({ ...p, body_fat_pct: e.target.value })} /></div>
          <div><span className="label">Goal body fat %</span><input className="input" type="number" step="0.1" value={p.goal_body_fat_pct ?? ""} onChange={(e) => setP({ ...p, goal_body_fat_pct: e.target.value })} /></div>
          <div><span className="label">Goal weight (lb)</span><input className="input" type="number" step="0.1" placeholder="leave blank if no preference" value={p.goal_weight_lb ?? ""} onChange={(e) => setP({ ...p, goal_weight_lb: e.target.value })} /></div>
          <div><span className="label">Calorie target</span><input className="input" type="number" value={p.calorie_target ?? ""} onChange={(e) => setP({ ...p, calorie_target: e.target.value })} /></div>
          <div><span className="label">Protein target (g)</span><input className="input" type="number" value={p.protein_target_g ?? ""} onChange={(e) => setP({ ...p, protein_target_g: e.target.value })} /></div>
        </div>

        <div className="flex gap-2">
          <button className="btn" onClick={() => save(false)} disabled={saving}>Save</button>
          <button className="btn-primary" onClick={() => save(true)} disabled={saving}>Save + recompute targets</button>
        </div>
        {msg && <div className="text-xs text-good">{msg}</div>}
      </section>

      {goalWeightKg != null && muscleToGain != null && fatToLoseRecomp != null ? (
        <section className="panel p-5 text-sm space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted">Recomp math (target {(goalWeightKg * 2.20462).toFixed(0)} lb @ {p.goal_body_fat_pct}% BF)</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-muted">Now</div><div className="text-muted">Goal</div>
            <div>Weight: <span className="text-white">{(p.weight_kg * 2.20462).toFixed(1)} lb</span></div>
            <div>Weight: <span className="text-white">{(goalWeightKg * 2.20462).toFixed(1)} lb</span></div>
            <div>Lean: <span className="text-white">{(lbm! * 2.20462).toFixed(1)} lb</span></div>
            <div>Lean: <span className="text-white">{(recompTargetLbm! * 2.20462).toFixed(1)} lb</span></div>
            <div>Fat: <span className="text-white">{(currentFatKg! * 2.20462).toFixed(1)} lb</span></div>
            <div>Fat: <span className="text-white">{(recompTargetFatKg! * 2.20462).toFixed(1)} lb</span></div>
          </div>
          <div className="border-t border-border pt-2 space-y-0.5">
            <div>Muscle to gain: <span className="text-good">+{(muscleToGain * 2.20462).toFixed(1)} lb</span></div>
            <div>Fat to lose: <span className="text-warn">−{(fatToLoseRecomp * 2.20462).toFixed(1)} lb</span></div>
            <div className="text-xs text-muted mt-1">
              Recomp is slow — natural lifters typically gain ~0.25-0.5 lb lean/month while losing fat. Realistic timeline: 12-18 months. Plan: small calorie deficit, 1g protein per lb of goal weight, progressive overload 4-5×/week.
            </div>
          </div>
        </section>
      ) : cutFatToLose != null ? (
        <section className="panel p-5 text-sm space-y-1">
          <div className="text-xs uppercase tracking-wider text-muted">Cut math (preserves current lean mass)</div>
          <div>Lean mass: <span className="text-white">{lbm?.toFixed(1)} kg</span> ({(lbm! * 2.20462).toFixed(1)} lb)</div>
          <div>Target weight at {p.goal_body_fat_pct}% BF: <span className="text-white">{cutWeight?.toFixed(1)} kg</span> ({(cutWeight! * 2.20462).toFixed(1)} lb)</div>
          <div>Fat to lose: <span className="text-white">{cutFatToLose.toFixed(1)} kg</span> ({(cutFatToLose * 2.20462).toFixed(1)} lb)</div>
          <div>At ~1 lb/wk: <span className="text-white">~{cutWeeks} weeks</span></div>
        </section>
      ) : null}
    </div>
  );
}
