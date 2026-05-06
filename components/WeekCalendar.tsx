"use client";
import { useEffect, useState } from "react";

type Day = {
  date: string;
  weekday: number;
  weekdayName: string;
  isPast: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  suggestedKey: string | null;
  suggestedName: string | null;
  loggedWorkouts: Array<{ id: number; type: string; template_key: string | null; duration_min: number | null; intensity: string | null }>;
  inferredKey: string | null;
};

type Recommendation = { date: string; key: string; name: string; reason: string };

const KEY_COLORS: Record<string, string> = {
  push: "#22d3ee",
  pull: "#a855f7",
  legs_squat: "#10b981",
  upper: "#f59e0b",
  legs_dl: "#84cc16",
  z2_row: "#71717a",
  active_recovery: "#3f3f46",
};

function shortName(key: string | null): string {
  if (!key) return "—";
  const map: Record<string, string> = {
    push: "Push",
    pull: "Pull",
    legs_squat: "Legs A",
    upper: "Upper",
    legs_dl: "Legs B",
    z2_row: "Z2 Row",
    active_recovery: "Recovery",
  };
  return map[key] ?? key;
}

export function WeekCalendar() {
  const [calendar, setCalendar] = useState<Day[] | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);

  useEffect(() => {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    fetch(`/api/schedule?date=${localDate}`)
      .then((r) => r.json())
      .then((d) => {
        setCalendar(d.calendar);
        setRec(d.recommendation);
      });
  }, []);

  if (!calendar) return <div className="text-sm text-muted">Loading schedule…</div>;

  const visible = calendar.filter((d) => {
    const i = calendar.indexOf(d);
    const today = calendar.findIndex((c) => c.isToday);
    return i >= today - 4 && i <= today + 7;
  });

  return (
    <div className="space-y-4">
      {rec && (
        <div className="panel border-accent/40 bg-accent/5 p-4">
          <div className="text-xs uppercase tracking-wider text-accent mb-1">Tomorrow</div>
          <div className="text-lg font-medium">{rec.name}</div>
          <div className="text-sm text-muted mt-1">{rec.reason}</div>
        </div>
      )}

      <div className="panel p-4">
        <div className="text-xs uppercase tracking-wider text-muted mb-3">This + next week</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {visible.map((d) => {
            const lifts = d.loggedWorkouts.filter((w) => w.template_key && w.template_key !== "z2_row");
            const cardio = d.loggedWorkouts.filter((w) => w.template_key === "z2_row" || w.type.toLowerCase() === "rowing");
            const hasLogged = lifts.length > 0 || cardio.length > 0;
            const showLogged = d.isPast || (d.isToday && hasLogged);
            const tomorrowKey = rec && d.isTomorrow ? rec.key : d.suggestedKey;
            const displayKey = showLogged ? d.inferredKey || "active_recovery" : tomorrowKey;
            const color = displayKey ? KEY_COLORS[displayKey] ?? "#3f3f46" : "#3f3f46";

            return (
              <div
                key={d.date}
                className={`rounded-lg border p-3 text-sm transition ${
                  d.isToday
                    ? "border-accent bg-accent/5"
                    : d.isTomorrow
                      ? "border-accent/40"
                      : d.isPast
                        ? "border-border bg-bg/30 opacity-80"
                        : "border-border"
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <div>
                    <span className="font-medium">{d.weekdayName}</span>
                    <span className="text-xs text-muted ml-1">{d.date.slice(5)}</span>
                  </div>
                  {d.isToday && <span className="text-[10px] font-mono uppercase text-accent">today</span>}
                  {d.isTomorrow && !d.isToday && <span className="text-[10px] font-mono uppercase text-accent/70">tomorrow</span>}
                </div>

                {showLogged ? (
                  hasLogged ? (
                    <div className="space-y-0.5">
                      {lifts.map((w) => (
                        <div key={w.id} className="flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: KEY_COLORS[w.template_key!] ?? "#3f3f46" }} />
                          <span>{shortName(w.template_key)}</span>
                          {w.duration_min && <span className="text-muted">· {w.duration_min}m</span>}
                        </div>
                      ))}
                      {cardio.map((w) => (
                        <div key={w.id} className="flex items-center gap-1.5 text-xs text-muted">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                          <span>{w.duration_min ?? "?"}m row</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted">rest</div>
                  )
                ) : (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    <span className={d.isToday ? "text-white" : ""}>{shortName(displayKey)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-xs text-muted mt-3">
          Past days show what you logged. Future days are the default rotation — Mon Push · Tue Pull · Wed Legs A · Thu Upper · Fri Legs B · Sat Z2 · Sun rest.
        </div>
      </div>
    </div>
  );
}
