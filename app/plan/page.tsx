import { WORKOUT_TEMPLATES } from "@/lib/workoutPlan";
import { WeekCalendar } from "@/components/WeekCalendar";

export default function PlanPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Training Plan</h1>
        <p className="text-sm text-muted mt-1">5-day Push/Pull/Legs/Upper/Lower. Each muscle group hit ~2×/week. HIIT + Z2 cardio woven in as finishers.</p>
      </div>

      <WeekCalendar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WORKOUT_TEMPLATES.filter((t) => !["z2_row", "active_recovery"].includes(t.key)).map((t) => (
          <section key={t.key} className="panel p-4">
            <h2 className="font-medium mb-2">{t.name}</h2>
            <ul className="text-sm space-y-1">
              {t.exercises.map((e, i) => (
                <li key={i} className="text-muted">
                  <span className="text-white">{e}</span>
                </li>
              ))}
              {t.finisher && <li className="pt-1 text-accent text-xs">Finisher: {t.finisher}</li>}
            </ul>
          </section>
        ))}
      </div>

      <section className="panel p-4 text-sm">
        <span className="label">How to make 5-day recomp work</span>
        <ul className="space-y-1 list-disc pl-5">
          <li><strong>Progressive overload is non-negotiable.</strong> Log top-set weight in the workout notes — beat it week to week (more weight, more reps, or cleaner reps). Without this, all that volume becomes wasted recovery cost.</li>
          <li><strong>Protein every day.</strong> Hit your daily target. Lifting + protein is what tells your body to keep / build muscle in a deficit.</li>
          <li><strong>Sleep ≥7h.</strong> 5 days of training + cardio raises recovery demand. If you can't sleep, drop volume — don't push through.</li>
          <li><strong>Track your Whoop recovery.</strong> If recovery is &lt;34 (red), swap that day's session for Z2 row or rest. Two reds in a row → take a full rest day. A week averaging &lt;50 → deload (drop weights 20% for a week).</li>
          <li><strong>Re-measure every 2 weeks</strong> (same time of day, ideally morning fasted). Scale weight will barely move — body fat % and how clothes fit are the real signals.</li>
        </ul>
      </section>

      <section className="panel p-4 text-sm">
        <span className="label">When to back off</span>
        <ul className="space-y-1 list-disc pl-5">
          <li>Top-set weight stalls or drops 2 weeks running on the same lift</li>
          <li>Resting heart rate up &gt;5 bpm vs. baseline for 3+ days</li>
          <li>HRV trending down for &gt;1 week</li>
          <li>Joint pain (not muscle soreness) on any compound</li>
          <li>Sustained low motivation / poor sleep</li>
        </ul>
        <div className="mt-2 text-muted text-xs">If any 2 of these stack, drop to 4 days for 1–2 weeks then ramp back up. This isn't quitting — it's how you don't waste 6 weeks digging out of overtraining.</div>
      </section>
    </div>
  );
}
