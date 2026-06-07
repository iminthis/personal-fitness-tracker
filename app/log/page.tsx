"use client";
import { useEffect, useState } from "react";
import { WORKOUT_TEMPLATES, templateAsNotes, type WorkoutTemplate } from "@/lib/workoutPlan";

export default function LogPage() {
  const [date, setDate] = useState("");
  const [foods, setFoods] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);

  const [foodName, setFoodName] = useState("");
  const [foodCals, setFoodCals] = useState("");
  const [foodProt, setFoodProt] = useState("");

  const [woType, setWoType] = useState("");
  const [woDur, setWoDur] = useState("");
  const [woIntensity, setWoIntensity] = useState("moderate");
  const [woNotes, setWoNotes] = useState("");
  const [woTemplate, setWoTemplate] = useState<string>("");

  function applyTemplate(t: WorkoutTemplate) {
    setWoTemplate(t.key);
    setWoType(t.name);
    if (!woNotes.trim()) setWoNotes(templateAsNotes(t));
    if (t.key === "z2_row") {
      setWoIntensity("light");
      if (!woDur) setWoDur("30");
    } else if (t.key === "active_recovery") {
      setWoIntensity("light");
      if (!woDur) setWoDur("20");
    } else {
      setWoIntensity("hard");
      if (!woDur) setWoDur("60");
    }
  }
  function clearTemplate() {
    setWoTemplate("");
    setWoType("");
    setWoNotes("");
    setWoDur("");
  }

  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightMsg, setWeightMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [recentWeights, setRecentWeights] = useState<any[]>([]);
  const [burnOverride, setBurnOverride] = useState("");
  const [savingBurn, setSavingBurn] = useState(false);
  const [burnMsg, setBurnMsg] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  async function loadRecentWeights() {
    const r = await fetch("/api/log/weight");
    const j = await r.json();
    setRecentWeights(j.rows || []);
  }
  useEffect(() => {
    loadRecentWeights();
  }, []);

  useEffect(() => {
    const today = new Date();
    setDate(new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  }, []);

  async function load() {
    if (!date) return;
    const [f, w] = await Promise.all([
      fetch(`/api/log/food?date=${date}`).then((r) => r.json()),
      fetch(`/api/log/workout?date=${date}${showHidden ? "&includeHidden=1" : ""}`).then((r) => r.json()),
    ]);
    setFoods(f.rows);
    setWorkouts(w.rows);
  }
  useEffect(() => {
    load();
  }, [date, showHidden]);

  async function addFood(e: React.FormEvent) {
    e.preventDefault();
    if (!foodName && !foodCals) return;
    await fetch("/api/log/food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, name: foodName, calories: foodCals, protein_g: foodProt }),
    });
    setFoodName("");
    setFoodCals("");
    setFoodProt("");
    load();
  }
  async function delFood(id: number) {
    await fetch(`/api/log/food?id=${id}`, { method: "DELETE" });
    load();
  }
  async function addWorkout(e: React.FormEvent) {
    e.preventDefault();
    if (!woType) return;
    await fetch("/api/log/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, type: woType, duration_min: woDur, intensity: woIntensity, notes: woNotes }),
    });
    setWoType("");
    setWoDur("");
    setWoNotes("");
    setWoTemplate("");
    load();
  }
  async function delWorkout(id: number) {
    await fetch(`/api/log/workout?id=${id}`, { method: "DELETE" });
    load();
  }
  async function setWorkoutTemplate(id: number, key: string) {
    await fetch(`/api/log/workout`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, template_key: key }),
    });
    load();
  }
  async function setWorkoutHidden(id: number, hidden: boolean) {
    await fetch(`/api/log/workout`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, hidden }),
    });
    load();
  }
  async function saveBurn(e: React.FormEvent) {
    e.preventDefault();
    setSavingBurn(true);
    setBurnMsg(null);
    const r = await fetch("/api/log/burn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, burn_kcal: burnOverride === "" ? null : burnOverride }),
    });
    const j = await r.json();
    if (j.ok) {
      setBurnMsg(burnOverride === "" ? `Cleared override for ${date}.` : `Saved ${burnOverride} kcal override for ${date}.`);
      setBurnOverride("");
    } else {
      setBurnMsg(`Error: ${j.error || "failed"}`);
    }
    setSavingBurn(false);
  }
  async function saveWeight(e: React.FormEvent) {
    e.preventDefault();
    setSavingWeight(true);
    setWeightMsg(null);
    const weight_kg = weight !== "" ? parseFloat(weight) / 2.20462 : null;
    const r = await fetch("/api/log/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, weight_kg, body_fat_pct: bodyFat || null }),
    });
    const j = await r.json();
    if (j.ok && j.saved) {
      const wt = j.saved.weight_kg ? `${(j.saved.weight_kg * 2.20462).toFixed(1)} lb` : "—";
      const bf = j.saved.body_fat_pct ? `${j.saved.body_fat_pct}%` : "—";
      setWeightMsg({ ok: true, text: `Saved for ${j.saved.date}: ${wt} · ${bf} BF` });
      setWeight("");
      setBodyFat("");
      loadRecentWeights();
    } else {
      setWeightMsg({ ok: false, text: j.error || "Save failed" });
    }
    setSavingWeight(false);
  }

  const totalCal = foods.reduce((s, f) => s + f.calories, 0);
  const totalProt = foods.reduce((s, f) => s + f.protein_g, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Log</h1>
        <input className="input max-w-[180px]" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="panel p-4">
          <h2 className="font-medium mb-3">Food</h2>
          <form onSubmit={addFood} className="grid grid-cols-12 gap-2 mb-3">
            <input className="input col-span-5" placeholder="What did you eat?" value={foodName} onChange={(e) => setFoodName(e.target.value)} />
            <input className="input col-span-3" placeholder="kcal" type="number" value={foodCals} onChange={(e) => setFoodCals(e.target.value)} />
            <input className="input col-span-3" placeholder="protein g" type="number" value={foodProt} onChange={(e) => setFoodProt(e.target.value)} />
            <button className="btn-primary col-span-1">+</button>
          </form>
          <div className="text-xs text-muted mb-2">
            Total: <span className="text-white">{totalCal}</span> kcal · <span className="text-white">{totalProt}</span> g protein
          </div>
          <ul className="space-y-1 text-sm">
            {foods.map((f) => (
              <li key={f.id} className="flex items-center justify-between bg-bg/40 rounded-md px-3 py-2 border border-border">
                <span>{f.name}</span>
                <span className="text-muted text-xs">
                  {f.calories} kcal · {f.protein_g}g
                  <button className="btn-danger ml-2" onClick={() => delFood(f.id)}>×</button>
                </span>
              </li>
            ))}
            {!foods.length && <li className="text-muted text-xs">No food logged for this date.</li>}
          </ul>
        </section>

        <section className="panel p-4">
          <h2 className="font-medium mb-3">Workout</h2>
          <div className="mb-3">
            <div className="text-xs uppercase tracking-wider text-muted mb-2">Pick from your plan</div>
            <div className="flex flex-wrap gap-1.5">
              {WORKOUT_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition ${
                    woTemplate === t.key
                      ? "bg-accent text-black border-accent"
                      : "bg-panel border-border hover:border-accent"
                  }`}
                >
                  {t.short}
                </button>
              ))}
              {woTemplate && (
                <button type="button" onClick={clearTemplate} className="text-xs text-muted hover:text-white px-2 py-1">
                  clear
                </button>
              )}
            </div>
          </div>
          <form onSubmit={addWorkout} className="space-y-2 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Type (e.g. Push, Run)" value={woType} onChange={(e) => setWoType(e.target.value)} />
              <input className="input" placeholder="Duration (min)" type="number" value={woDur} onChange={(e) => setWoDur(e.target.value)} />
            </div>
            <select className="input" value={woIntensity} onChange={(e) => setWoIntensity(e.target.value)}>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
              <option value="max">Max</option>
            </select>
            <textarea
              className="input min-h-[120px] font-mono text-xs"
              placeholder="Notes / exercises / top-set weights"
              value={woNotes}
              onChange={(e) => setWoNotes(e.target.value)}
            />
            <button className="btn-primary w-full">Add workout</button>
          </form>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">{workouts.filter((w) => !w.hidden).length} active{showHidden ? `, ${workouts.filter((w) => w.hidden).length} hidden` : ""}</span>
            <button className="text-xs text-muted hover:text-white" onClick={() => setShowHidden(!showHidden)}>
              {showHidden ? "hide merged" : "show merged duplicates"}
            </button>
          </div>
          <ul className="space-y-1 text-sm">
            {workouts.map((w) => (
              <li key={w.id} className={`bg-bg/40 rounded-md px-3 py-2 border border-border ${w.hidden ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{w.type}</span>
                      <span className="text-xs text-muted">· {w.duration_min ?? "—"}min · {w.intensity ?? "—"}</span>
                      {w.start_at && (
                        <span className="text-xs text-muted">· {new Date(w.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      )}
                      {w.source === "whoop" && <span className="text-xs text-accent">via Whoop</span>}
                      {w.hidden && <span className="text-xs text-warn">hidden</span>}
                    </div>
                    {w.notes && <pre className="text-xs text-muted whitespace-pre-wrap font-mono mt-1">{w.notes}</pre>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <select
                      className="text-xs bg-bg border border-border rounded px-1.5 py-1 max-w-[130px]"
                      value={w.template_key ?? ""}
                      onChange={(e) => setWorkoutTemplate(w.id, e.target.value)}
                      title="Tag with which plan day"
                    >
                      <option value="">— tag day —</option>
                      {WORKOUT_TEMPLATES.map((t) => (
                        <option key={t.key} value={t.key}>{t.short}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      {w.source === "whoop" && (
                        <button
                          className="btn-danger"
                          title={w.hidden ? "Restore" : "Hide as duplicate"}
                          onClick={() => setWorkoutHidden(w.id, !w.hidden)}
                        >
                          {w.hidden ? "↺" : "−"}
                        </button>
                      )}
                      {w.source === "manual" && <button className="btn-danger" onClick={() => delWorkout(w.id)}>×</button>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {!workouts.length && <li className="text-muted text-xs">No workouts for this date.</li>}
          </ul>
        </section>
      </div>

      <section className="panel p-4">
        <h2 className="font-medium mb-1">Body</h2>
        <p className="text-xs text-muted mb-3">Log weight as often as you can — ideally same time/conditions (morning, fasted). <span className="text-white">Body fat is optional</span>; only fill it in when you actually measure (DEXA, InBody, calipers, etc.). Leave blank otherwise — past values are preserved.</p>
        <form onSubmit={saveWeight} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
          <div>
            <span className="label">Weight (lb)</span>
            <input className="input" type="number" step="0.1" placeholder="176" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <span className="label">Body fat % <span className="text-muted normal-case tracking-normal">(optional)</span></span>
            <input className="input" type="number" step="0.1" placeholder="leave blank if not measuring" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={savingWeight}>{savingWeight ? "Saving…" : "Save"}</button>
        </form>
        {weightMsg && (
          <div className={`text-xs mt-2 ${weightMsg.ok ? "text-good" : "text-bad"}`}>{weightMsg.text}</div>
        )}
        {recentWeights.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wider text-muted mb-2">Recent ({recentWeights.length})</div>
            <ul className="text-xs space-y-0.5 max-h-48 overflow-y-auto">
              {recentWeights.map((r) => (
                <li key={r.date} className="flex justify-between gap-2 tabular-nums">
                  <span className="text-muted">{r.date}</span>
                  <span>{r.weight_kg ? `${(r.weight_kg * 2.20462).toFixed(1)} lb` : "—"} · {r.body_fat_pct ? `${r.body_fat_pct}% BF` : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="font-medium mb-1">Burn override</h2>
        <p className="text-xs text-muted mb-3">Use this when Whoop coverage was incomplete (took off the strap, dead battery, etc.). Overrides the Whoop number for this date. Leave blank + save to clear.</p>
        <form onSubmit={saveBurn} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
          <div className="md:col-span-2">
            <span className="label">Estimated burn (kcal)</span>
            <input className="input" type="number" step="50" placeholder="2400" value={burnOverride} onChange={(e) => setBurnOverride(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={savingBurn}>{savingBurn ? "Saving…" : "Save"}</button>
        </form>
        {burnMsg && <div className="text-xs text-good mt-2">{burnMsg}</div>}
      </section>
    </div>
  );
}
