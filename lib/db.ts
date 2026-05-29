import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let _client: NeonQueryFunction<false, false> | null = null;
function client(): NeonQueryFunction<false, false> {
  if (_client) return _client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. On Vercel, add it under Project Settings → Environment Variables and redeploy.",
    );
  }
  _client = neon(url);
  return _client;
}

export const sql: NeonQueryFunction<false, false> = new Proxy(((..._args: any[]) => {}) as any, {
  get(_t, prop) {
    return (client() as any)[prop];
  },
  apply(_t, _thisArg, args) {
    return (client() as any)(...args);
  },
});

let _migrated = false;
let _migrating: Promise<void> | null = null;

export async function ensureMigrated(): Promise<void> {
  if (_migrated) return;
  if (_migrating) return _migrating;
  _migrating = runMigrations().then(() => {
    _migrated = true;
  });
  return _migrating;
}

async function runMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      sex TEXT,
      age INTEGER,
      height_cm REAL,
      weight_kg REAL,
      body_fat_pct REAL,
      goal_body_fat_pct REAL,
      goal_weight_kg REAL,
      activity_level TEXT,
      calorie_target INTEGER,
      protein_target_g INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`ALTER TABLE profile ADD COLUMN IF NOT EXISTS goal_weight_kg REAL`;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_log (
      date TEXT PRIMARY KEY,
      calories INTEGER DEFAULT 0,
      protein_g INTEGER DEFAULT 0,
      weight_kg REAL,
      body_fat_pct REAL,
      burn_kcal_override INTEGER,
      notes TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`ALTER TABLE daily_log ADD COLUMN IF NOT EXISTS burn_kcal_override INTEGER`;

  await sql`
    CREATE TABLE IF NOT EXISTS food_entry (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein_g INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_food_date ON food_entry(date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS workout (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      duration_min INTEGER,
      intensity TEXT,
      notes TEXT,
      source TEXT DEFAULT 'manual',
      external_id TEXT,
      start_at TEXT,
      end_at TEXT,
      strain REAL,
      template_key TEXT,
      hidden INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`ALTER TABLE workout ADD COLUMN IF NOT EXISTS start_at TEXT`;
  await sql`ALTER TABLE workout ADD COLUMN IF NOT EXISTS end_at TEXT`;
  await sql`ALTER TABLE workout ADD COLUMN IF NOT EXISTS strain REAL`;
  await sql`ALTER TABLE workout ADD COLUMN IF NOT EXISTS template_key TEXT`;
  await sql`ALTER TABLE workout ADD COLUMN IF NOT EXISTS hidden INTEGER DEFAULT 0`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_external ON workout(source, external_id) WHERE external_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_workout_date ON workout(date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS whoop_token (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      scope TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS whoop_recovery (
      date TEXT PRIMARY KEY,
      score INTEGER,
      hrv_rmssd_ms REAL,
      resting_hr INTEGER,
      raw TEXT
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS whoop_sleep (
      date TEXT PRIMARY KEY,
      duration_min INTEGER,
      efficiency_pct REAL,
      performance_pct REAL,
      raw TEXT
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS whoop_cycle (
      date TEXT PRIMARY KEY,
      strain REAL,
      kilojoule REAL,
      avg_hr INTEGER,
      max_hr INTEGER,
      raw TEXT
    )`;
}

export type Profile = {
  id: number;
  name: string | null;
  sex: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  goal_body_fat_pct: number | null;
  goal_weight_kg: number | null;
  activity_level: string | null;
  calorie_target: number | null;
  protein_target_g: number | null;
};

export async function getProfile(): Promise<Profile | null> {
  await ensureMigrated();
  const rows = (await sql`SELECT * FROM profile WHERE id = 1`) as any[];
  return (rows[0] as Profile) ?? null;
}

export async function upsertProfile(p: Partial<Profile>): Promise<void> {
  await ensureMigrated();
  const existing = await getProfile();
  if (!existing) {
    await sql`
      INSERT INTO profile (id, name, sex, age, height_cm, weight_kg, body_fat_pct,
        goal_body_fat_pct, goal_weight_kg, activity_level, calorie_target, protein_target_g)
      VALUES (1, ${p.name ?? null}, ${p.sex ?? null}, ${p.age ?? null},
        ${p.height_cm ?? null}, ${p.weight_kg ?? null}, ${p.body_fat_pct ?? null},
        ${p.goal_body_fat_pct ?? null}, ${p.goal_weight_kg ?? null},
        ${p.activity_level ?? null}, ${p.calorie_target ?? null}, ${p.protein_target_g ?? null})`;
  } else {
    const m = { ...existing, ...p };
    await sql`
      UPDATE profile SET
        name = ${m.name},
        sex = ${m.sex},
        age = ${m.age},
        height_cm = ${m.height_cm},
        weight_kg = ${m.weight_kg},
        body_fat_pct = ${m.body_fat_pct},
        goal_body_fat_pct = ${m.goal_body_fat_pct},
        goal_weight_kg = ${m.goal_weight_kg},
        activity_level = ${m.activity_level},
        calorie_target = ${m.calorie_target},
        protein_target_g = ${m.protein_target_g},
        updated_at = NOW()
      WHERE id = 1`;
  }
}

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60 * 1000).toISOString().slice(0, 10);
}
