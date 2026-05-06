import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "fitness.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(d: Database.Database) {
  d.exec(`
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_log (
      date TEXT PRIMARY KEY,
      calories INTEGER DEFAULT 0,
      protein_g INTEGER DEFAULT 0,
      weight_kg REAL,
      body_fat_pct REAL,
      notes TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS food_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein_g INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_food_date ON food_entry(date);

    CREATE TABLE IF NOT EXISTS workout (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_external ON workout(source, external_id) WHERE external_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_workout_date ON workout(date);

    CREATE TABLE IF NOT EXISTS whoop_token (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      scope TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS whoop_recovery (
      date TEXT PRIMARY KEY,
      score INTEGER,
      hrv_rmssd_ms REAL,
      resting_hr INTEGER,
      raw TEXT
    );

    CREATE TABLE IF NOT EXISTS whoop_sleep (
      date TEXT PRIMARY KEY,
      duration_min INTEGER,
      efficiency_pct REAL,
      performance_pct REAL,
      raw TEXT
    );

    CREATE TABLE IF NOT EXISTS whoop_cycle (
      date TEXT PRIMARY KEY,
      strain REAL,
      kilojoule REAL,
      avg_hr INTEGER,
      max_hr INTEGER,
      raw TEXT
    );
  `);

  const profileCols = d.prepare("PRAGMA table_info(profile)").all() as Array<{ name: string }>;
  if (!profileCols.some((c) => c.name === "goal_weight_kg")) d.exec("ALTER TABLE profile ADD COLUMN goal_weight_kg REAL");

  const workoutCols = d.prepare("PRAGMA table_info(workout)").all() as Array<{ name: string }>;
  const hasW = (n: string) => workoutCols.some((c) => c.name === n);
  if (!hasW("start_at")) d.exec("ALTER TABLE workout ADD COLUMN start_at TEXT");
  if (!hasW("end_at")) d.exec("ALTER TABLE workout ADD COLUMN end_at TEXT");
  if (!hasW("strain")) d.exec("ALTER TABLE workout ADD COLUMN strain REAL");
  if (!hasW("template_key")) d.exec("ALTER TABLE workout ADD COLUMN template_key TEXT");
  if (!hasW("hidden")) d.exec("ALTER TABLE workout ADD COLUMN hidden INTEGER DEFAULT 0");
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

export function getProfile(): Profile | null {
  return db().prepare("SELECT * FROM profile WHERE id = 1").get() as Profile | null;
}

export function upsertProfile(p: Partial<Profile>) {
  const existing = getProfile();
  if (!existing) {
    db()
      .prepare(
        `INSERT INTO profile (id, name, sex, age, height_cm, weight_kg, body_fat_pct, goal_body_fat_pct, goal_weight_kg, activity_level, calorie_target, protein_target_g)
         VALUES (1, @name, @sex, @age, @height_cm, @weight_kg, @body_fat_pct, @goal_body_fat_pct, @goal_weight_kg, @activity_level, @calorie_target, @protein_target_g)`,
      )
      .run({
        name: p.name ?? null,
        sex: p.sex ?? null,
        age: p.age ?? null,
        height_cm: p.height_cm ?? null,
        weight_kg: p.weight_kg ?? null,
        body_fat_pct: p.body_fat_pct ?? null,
        goal_body_fat_pct: p.goal_body_fat_pct ?? null,
        goal_weight_kg: p.goal_weight_kg ?? null,
        activity_level: p.activity_level ?? null,
        calorie_target: p.calorie_target ?? null,
        protein_target_g: p.protein_target_g ?? null,
      });
  } else {
    const merged = { ...existing, ...p };
    db()
      .prepare(
        `UPDATE profile SET name=@name, sex=@sex, age=@age, height_cm=@height_cm, weight_kg=@weight_kg,
         body_fat_pct=@body_fat_pct, goal_body_fat_pct=@goal_body_fat_pct, goal_weight_kg=@goal_weight_kg,
         activity_level=@activity_level, calorie_target=@calorie_target, protein_target_g=@protein_target_g,
         updated_at=CURRENT_TIMESTAMP WHERE id = 1`,
      )
      .run(merged);
  }
}

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60 * 1000).toISOString().slice(0, 10);
}
