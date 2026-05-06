export type WorkoutTemplate = {
  key: string;
  name: string;
  short: string;
  exercises: string[];
  finisher?: string;
};

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    key: "push",
    name: "Push (Bench focus)",
    short: "Push",
    exercises: [
      "Bench press: 4×5–8",
      "Overhead press: 3×8–10",
      "Incline DB press or close-grip bench: 3×8–10",
      "Lateral raises: 3×12–15",
      "Tricep extensions or skull crushers: 3×10–12",
    ],
    finisher: "HIIT row: 6×250m, 1 min rest",
  },
  {
    key: "pull",
    name: "Pull (Row focus)",
    short: "Pull",
    exercises: [
      "Barbell row: 4×6–10",
      "Weighted pull-ups (or AMRAP): 4×6–8",
      "Pendlay row or seal row: 3×8",
      "Face pulls or rear-delt fly: 3×12–15",
      "EZ-bar curls: 3×10–12",
      "Hammer / reverse curls: 3×12",
    ],
    finisher: "Z2 row: 15 min steady",
  },
  {
    key: "legs_squat",
    name: "Legs A — Squat focus",
    short: "Legs A",
    exercises: [
      "Back squat: 4×5–8",
      "Romanian deadlift: 3×8–10",
      "Walking lunges or split squats: 3×10/leg",
      "Hanging leg raises: 3× AMRAP",
      "Calf raises: 4×12–15",
    ],
    finisher: "Z2 row: 12 min steady",
  },
  {
    key: "upper",
    name: "Upper (Density)",
    short: "Upper",
    exercises: [
      "Overhead press: 4×5–8",
      "Pull-ups (AMRAP): 4 sets",
      "Incline bench (or close-grip bench): 3×8–10",
      "Pendlay row: 3×8",
      "Skull crushers: 3×10",
      "Preacher curls (use your attachment): 3×10",
    ],
    finisher: "HIIT row: 5×500m, 90s rest",
  },
  {
    key: "legs_dl",
    name: "Legs B — Deadlift focus",
    short: "Legs B",
    exercises: [
      "Deadlift: 4×3–5",
      "Front squat: 3×6–8",
      "Single-leg RDL or hip thrust: 3×10",
      "Plank or ab wheel: 3×30–45s",
      "Calf raises: 3×15",
    ],
    finisher: "Z2 row: 20 min steady",
  },
  {
    key: "z2_row",
    name: "Z2 Row (extra cardio)",
    short: "Z2 Row",
    exercises: ["Z2 steady-state row, conversational pace", "Target: 20–40 min"],
  },
  {
    key: "active_recovery",
    name: "Active recovery",
    short: "Recovery",
    exercises: ["20 min easy row, walk, or mobility/stretching"],
  },
];

export const WEEKLY_LAYOUT =
  "Mon Push · Tue Pull · Wed Legs A · Thu Upper · Fri Legs B · Sat Z2 row 30 min · Sun rest";

export function templateAsNotes(t: WorkoutTemplate) {
  const lines = t.exercises.map((e) => `• ${e}`);
  if (t.finisher) lines.push(`• Finisher: ${t.finisher}`);
  return lines.join("\n");
}

export function findTemplate(key: string) {
  return WORKOUT_TEMPLATES.find((t) => t.key === key);
}
