"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ring } from "@/components/Ring";
import { Heatmap } from "@/components/Heatmap";
import { WeightChart } from "@/components/WeightChart";
import { MacroBars } from "@/components/MacroBars";

type Flag = { severity: "alert" | "warn" | "info"; title: string; detail: string; action?: string };
type Summary = {
  profile: any;
  today: string;
  todayTotals: { calories: number; protein_g: number };
  todayFoods: Array<any>;
  todayWorkouts: Array<any>;
  last30: Array<any>;
  whoopConnected: boolean;
  flags: Flag[];
};

export default function Page() {
  const [sum, setSum] = useState<Summary | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function load() {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    const r = await fetch(`/api/summary?date=${localDate}`);
    setSum(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function syncWhoop() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await fetch("/api/whoop/sync", { method: "POST" });
      const j = await r.json();
      if (j.ok) setSyncMsg(`Synced: ${JSON.stringify(j.counters)}`);
      else setSyncMsg(`Error: ${j.error}`);
      await load();
    } finally {
      setSyncing(false);
    }
  }

  if (!sum) return <div className="text-muted text-sm">Loading…</div>;

  const p = sum.profile;
  const calTarget = p?.calorie_target || 2000;
  const protTarget = p?.protein_target_g || 180;

  const calColor = (v: number) => {
    if (!v) return "#1f1f24";
    const ratio = v / calTarget;
    if (ratio < 0.5) return "#3f3f46";
    if (ratio < 0.85) return "#22d3ee55";
    if (ratio < 1.1) return "#22d3ee";
    return "#f59e0b";
  };
  const workoutColor = (v: number) => (v > 0 ? "#10b981" : "#1f1f24");
  const proteinColor = (v: number) => {
    if (!v) return "#1f1f24";
    const r = v / protTarget;
    if (r < 0.5) return "#3f3f46";
    if (r < 0.85) return "#a3e63555";
    return "#84cc16";
  };

  const workoutsLast30 = sum.last30.filter((d) => d.workouts > 0).length;
  const daysHitProtein = sum.last30.filter((d) => d.protein_g >= protTarget * 0.9).length;
  const daysHitCalories = sum.last30.filter((d) => d.calories <= calTarget * 1.05 && d.calories >= calTarget * 0.7).length;

  const lastRecovery = [...sum.last30].reverse().find((d) => d.recovery != null);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Hey {p?.name || "there"} 👋</h1>
          <p className="text-sm text-muted">
            {p?.weight_kg ? `${(p.weight_kg * 2.20462).toFixed(1)} lb` : ""} · {p?.body_fat_pct}% BF · goal {p?.goal_body_fat_pct}%
          </p>
        </div>
        <div className="flex gap-2">
          {sum.whoopConnected ? (
            <button onClick={syncWhoop} disabled={syncing} className="btn">
              {syncing ? "Syncing…" : "Sync Whoop"}
            </button>
          ) : (
            <a href="/api/whoop/auth" className="btn-primary">Connect Whoop</a>
          )}
          <Link href="/log" className="btn-primary">+ Log</Link>
        </div>
      </div>

      {syncMsg && <div className="text-xs text-muted">{syncMsg}</div>}

      {sum.flags && sum.flags.length > 0 && (
        <section className="space-y-2">
          {sum.flags.map((f, i) => {
            const colors = {
              alert: { border: "border-bad", bg: "bg-bad/10", dot: "bg-bad", label: "ALERT", labelColor: "text-bad" },
              warn: { border: "border-warn", bg: "bg-warn/10", dot: "bg-warn", label: "WARN", labelColor: "text-warn" },
              info: { border: "border-border", bg: "bg-panel", dot: "bg-muted", label: "INFO", labelColor: "text-muted" },
            }[f.severity];
            return (
              <div key={i} className={`panel ${colors.border} ${colors.bg} p-4 flex gap-3 items-start`}>
                <div className={`w-2 h-2 rounded-full mt-2 ${colors.dot}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${colors.labelColor}`}>{colors.label}</span>
                    <span className="font-medium text-sm">{f.title}</span>
                  </div>
                  <div className="text-xs text-muted mt-1">{f.detail}</div>
                  {f.action && <div className="text-xs mt-1.5 text-white">→ {f.action}</div>}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="panel p-6">
        <div className="text-xs uppercase tracking-wider text-muted mb-3">Today</div>
        <div className="flex flex-wrap gap-8 items-start">
          <Ring value={sum.todayTotals.calories} target={calTarget} label="Calories" />
          <Ring value={sum.todayTotals.protein_g} target={protTarget} label="Protein" unit="g" color="#84cc16" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted mb-1">Workouts today</div>
            <div className="stat-num">{sum.todayWorkouts.length}</div>
            <div className="stat-sub">
              {sum.todayWorkouts.length
                ? sum.todayWorkouts.map((w: any) => w.type).join(", ")
                : "Log a workout to keep the streak alive"}
            </div>
          </div>
          {lastRecovery && (
            <div>
              <div className="text-xs uppercase tracking-wider text-muted mb-1">Whoop Recovery</div>
              <div className="stat-num" style={{ color: lastRecovery.recovery >= 67 ? "#10b981" : lastRecovery.recovery >= 34 ? "#f59e0b" : "#ef4444" }}>
                {lastRecovery.recovery}%
              </div>
              <div className="stat-sub">{lastRecovery.date}</div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel p-4">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Workouts (30d)</div>
          <div className="stat-num">{workoutsLast30}<span className="text-sm text-muted">/30</span></div>
          <div className="stat-sub">{((workoutsLast30 / 30) * 100).toFixed(0)}% consistency</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Protein hit (30d)</div>
          <div className="stat-num">{daysHitProtein}<span className="text-sm text-muted">/30</span></div>
          <div className="stat-sub">days at ≥90% of target</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Calories in range (30d)</div>
          <div className="stat-num">{daysHitCalories}<span className="text-sm text-muted">/30</span></div>
          <div className="stat-sub">70-105% of target</div>
        </div>
      </section>

      <section className="panel p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Heatmap title="Calories (30d)" data={sum.last30} getValue={(d) => d.calories} colorFor={calColor} />
        <Heatmap title="Protein (30d)" data={sum.last30} getValue={(d) => d.protein_g} colorFor={proteinColor} />
        <Heatmap title="Workouts (30d)" data={sum.last30} getValue={(d) => d.workouts} colorFor={workoutColor} />
      </section>

      <section className="panel p-4 space-y-4">
        <MacroBars data={sum.last30.slice(-14)} field="calories" target={calTarget} color="#22d3ee" label="Calories (last 14 days)" />
        <MacroBars data={sum.last30.slice(-14)} field="protein_g" target={protTarget} color="#84cc16" label="Protein g (last 14 days)" />
      </section>

      <section className="panel p-4">
        <div className="text-xs uppercase tracking-wider text-muted mb-2">Weight trend (30d)</div>
        <WeightChart data={sum.last30} />
      </section>

      {!sum.whoopConnected && (
        <section className="panel p-4 text-sm">
          Connect your Whoop to pull recovery, sleep, strain, and workouts.{" "}
          <a href="/api/whoop/auth" className="text-accent">Connect now →</a>
        </section>
      )}
    </div>
  );
}
