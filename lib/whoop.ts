import { sql, ensureMigrated } from "./db";

const WHOOP_AUTH = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API = "https://api.prod.whoop.com/developer";

export const WHOOP_SCOPES = [
  "read:profile",
  "read:body_measurement",
  "read:cycles",
  "read:recovery",
  "read:sleep",
  "read:workout",
  "offline",
];

export function authUrl(state: string) {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    scope: WHOOP_SCOPES.join(" "),
    state,
  });
  return `${WHOOP_AUTH}?${p.toString()}`;
}

type TokenResp = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeCode(code: string): Promise<TokenResp> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
  });
  const r = await fetch(WHOOP_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`Whoop token exchange failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function refreshTokens(refreshToken: string): Promise<TokenResp> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
    scope: WHOOP_SCOPES.join(" "),
  });
  const r = await fetch(WHOOP_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`Whoop refresh failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function saveTokens(t: TokenResp) {
  await ensureMigrated();
  const expiresAt = Date.now() + t.expires_in * 1000;
  const existing = (await sql`SELECT id FROM whoop_token WHERE id = 1`) as any[];
  if (existing.length) {
    await sql`
      UPDATE whoop_token
      SET access_token = ${t.access_token},
          refresh_token = ${t.refresh_token},
          expires_at = ${expiresAt},
          scope = ${t.scope},
          updated_at = NOW()
      WHERE id = 1`;
  } else {
    await sql`
      INSERT INTO whoop_token (id, access_token, refresh_token, expires_at, scope)
      VALUES (1, ${t.access_token}, ${t.refresh_token}, ${expiresAt}, ${t.scope})`;
  }
}

type StoredToken = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
};

export async function getStoredToken(): Promise<StoredToken | null> {
  await ensureMigrated();
  const rows = (await sql`
    SELECT access_token, refresh_token, expires_at, scope FROM whoop_token WHERE id = 1
  `) as any[];
  return rows[0] ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  const tok = await getStoredToken();
  if (!tok) return null;
  const expiresAt = Number(tok.expires_at);
  if (Date.now() < expiresAt - 60_000) return tok.access_token;
  const refreshed = await refreshTokens(tok.refresh_token);
  await saveTokens(refreshed);
  return refreshed.access_token;
}

export async function whoopFetch(pathname: string, params?: Record<string, string>) {
  const tok = await getAccessToken();
  if (!tok) throw new Error("Not connected to Whoop");
  const url = new URL(`${WHOOP_API}${pathname}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${tok}` },
  });
  if (!r.ok) throw new Error(`Whoop ${pathname} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

function dateOnly(iso: string, tzOffset?: string | null) {
  if (!tzOffset) return iso.slice(0, 10);
  const m = tzOffset.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!m) return iso.slice(0, 10);
  const sign = m[1] === "-" ? -1 : 1;
  const offsetMin = sign * (parseInt(m[2]) * 60 + parseInt(m[3]));
  const local = new Date(new Date(iso).getTime() + offsetMin * 60_000);
  return local.toISOString().slice(0, 10);
}

export async function syncWhoop(daysBack = 30) {
  await ensureMigrated();
  const start = new Date(Date.now() - daysBack * 86400_000).toISOString();
  const end = new Date().toISOString();

  const counters = { recovery: 0, sleep: 0, cycle: 0, workout: 0, merged: 0 };

  const recoveries = await collect("/v2/recovery", { start, end });
  for (const r of recoveries) {
    const date = dateOnly(r.created_at ?? r.updated_at ?? new Date().toISOString(), r.timezone_offset);
    await sql`
      INSERT INTO whoop_recovery (date, score, hrv_rmssd_ms, resting_hr, raw)
      VALUES (${date}, ${r.score?.recovery_score ?? null}, ${r.score?.hrv_rmssd_milli ?? null},
              ${r.score?.resting_heart_rate ?? null}, ${JSON.stringify(r)})
      ON CONFLICT (date) DO UPDATE SET
        score = EXCLUDED.score,
        hrv_rmssd_ms = EXCLUDED.hrv_rmssd_ms,
        resting_hr = EXCLUDED.resting_hr,
        raw = EXCLUDED.raw`;
    counters.recovery++;
  }

  const sleeps = await collect("/v2/activity/sleep", { start, end });
  for (const s of sleeps) {
    const date = dateOnly(s.start ?? s.created_at, s.timezone_offset);
    const stage = s.score?.stage_summary;
    const totalMs = (stage?.total_in_bed_time_milli ?? 0) - (stage?.total_awake_time_milli ?? 0);
    const dur = Math.round(totalMs / 60000) || null;
    await sql`
      INSERT INTO whoop_sleep (date, duration_min, efficiency_pct, performance_pct, raw)
      VALUES (${date}, ${dur}, ${s.score?.sleep_efficiency_percentage ?? null},
              ${s.score?.sleep_performance_percentage ?? null}, ${JSON.stringify(s)})
      ON CONFLICT (date) DO UPDATE SET
        duration_min = EXCLUDED.duration_min,
        efficiency_pct = EXCLUDED.efficiency_pct,
        performance_pct = EXCLUDED.performance_pct,
        raw = EXCLUDED.raw`;
    counters.sleep++;
  }

  const cycles = await collect("/v2/cycle", { start, end });
  for (const c of cycles) {
    // Whoop's cycle.start can be the prior evening for users who go to bed early
    // (e.g. start = Sun 6pm PT, cycle actually accumulates Mon's activity).
    // Use the midpoint between start and end (or now, if ongoing) — this always
    // lands in the day the user is mostly awake during.
    const startMs = c.start ? new Date(c.start).getTime() : Date.now();
    const endMs = c.end ? new Date(c.end).getTime() : Date.now();
    const midpointISO = new Date((startMs + endMs) / 2).toISOString();
    const date = dateOnly(midpointISO, c.timezone_offset);
    // Clean up any stale row at the old start-based date for this same cycle ID.
    const cycleId = String(c.id ?? "");
    if (cycleId) {
      const startBased = dateOnly(c.start ?? c.created_at, c.timezone_offset);
      if (startBased !== date) {
        await sql`
          DELETE FROM whoop_cycle
          WHERE date = ${startBased}
            AND raw::jsonb->>'id' = ${cycleId}
        `;
      }
    }
    await sql`
      INSERT INTO whoop_cycle (date, strain, kilojoule, avg_hr, max_hr, raw)
      VALUES (${date}, ${c.score?.strain ?? null}, ${c.score?.kilojoule ?? null},
              ${c.score?.average_heart_rate ?? null}, ${c.score?.max_heart_rate ?? null},
              ${JSON.stringify(c)})
      ON CONFLICT (date) DO UPDATE SET
        strain = EXCLUDED.strain,
        kilojoule = EXCLUDED.kilojoule,
        avg_hr = EXCLUDED.avg_hr,
        max_hr = EXCLUDED.max_hr,
        raw = EXCLUDED.raw`;
    counters.cycle++;
  }

  const workouts = await collect("/v2/activity/workout", { start, end });
  for (const w of workouts) {
    const date = dateOnly(w.start, w.timezone_offset);
    const startT = new Date(w.start).getTime();
    const endT = new Date(w.end).getTime();
    const durMin = Math.round((endT - startT) / 60000) || null;
    const sport = w.sport_name ?? `Sport ${w.sport_id ?? "?"}`;
    const strain = w.score?.strain ?? null;
    const intensity = strain != null ? `Strain ${strain.toFixed(1)}` : null;
    const notes = `Avg HR ${w.score?.average_heart_rate ?? "?"}, kJ ${w.score?.kilojoule ?? "?"}`;
    await sql`
      INSERT INTO workout (date, type, duration_min, intensity, notes, source, external_id, start_at, end_at, strain)
      VALUES (${date}, ${sport}, ${durMin}, ${intensity}, ${notes}, 'whoop', ${String(w.id)},
              ${w.start ?? null}, ${w.end ?? null}, ${strain})
      ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
        date = EXCLUDED.date,
        type = EXCLUDED.type,
        duration_min = EXCLUDED.duration_min,
        intensity = EXCLUDED.intensity,
        notes = EXCLUDED.notes,
        start_at = EXCLUDED.start_at,
        end_at = EXCLUDED.end_at,
        strain = EXCLUDED.strain`;
    counters.workout++;
  }

  counters.merged = await dedupeWhoopWorkouts();
  return counters;
}

async function dedupeWhoopWorkouts(): Promise<number> {
  const all = (await sql`
    SELECT id, date, type, start_at, end_at, strain, duration_min FROM workout
    WHERE source = 'whoop' AND start_at IS NOT NULL AND end_at IS NOT NULL
  `) as Array<{
    id: number;
    date: string;
    type: string;
    start_at: string;
    end_at: string;
    strain: number | null;
    duration_min: number | null;
  }>;

  await sql`UPDATE workout SET hidden = 0 WHERE source = 'whoop'`;

  const buckets = new Map<string, typeof all>();
  for (const w of all) {
    const key = `${w.date}|${w.type.toLowerCase()}`;
    const arr = buckets.get(key) ?? [];
    arr.push(w);
    buckets.set(key, arr);
  }

  let merged = 0;
  for (const group of buckets.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) => (b.strain ?? 0) - (a.strain ?? 0) || (b.duration_min ?? 0) - (a.duration_min ?? 0),
    );
    const kept: typeof group = [];
    for (const w of sorted) {
      const wStart = new Date(w.start_at).getTime();
      const wEnd = new Date(w.end_at).getTime();
      const overlapsKept = kept.some((k) => {
        const kStart = new Date(k.start_at).getTime();
        const kEnd = new Date(k.end_at).getTime();
        const overlap = Math.max(0, Math.min(wEnd, kEnd) - Math.max(wStart, kStart));
        const shorter = Math.min(wEnd - wStart, kEnd - kStart);
        return shorter > 0 && overlap / shorter > 0.5;
      });
      if (overlapsKept) {
        await sql`UPDATE workout SET hidden = 1 WHERE id = ${w.id}`;
        merged++;
      } else {
        kept.push(w);
      }
    }
  }
  return merged;
}

async function collect(pathname: string, params: Record<string, string>): Promise<any[]> {
  const out: any[] = [];
  let nextToken: string | undefined;
  for (let i = 0; i < 10; i++) {
    const p: Record<string, string> = { ...params, limit: "25" };
    if (nextToken) p.nextToken = nextToken;
    const j = await whoopFetch(pathname, p);
    if (Array.isArray(j.records)) out.push(...j.records);
    nextToken = j.next_token;
    if (!nextToken) break;
  }
  return out;
}
