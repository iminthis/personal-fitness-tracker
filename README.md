# Fitness Tracker

Personal calorie / workout / body-comp tracker with Whoop integration and AI coaching.

Stack: Next.js 15 · Postgres (Neon) · Tailwind · Recharts · Anthropic SDK.

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in secrets
npm run init-db                     # runs migrations, seeds profile if empty
npm run dev                         # http://localhost:3000
```

Required env vars in `.env.local`:

| | |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` | Whoop developer app |
| `WHOOP_REDIRECT_URI` | `http://localhost:3000/api/whoop/callback` (or prod URL) |
| `ANTHROPIC_API_KEY` | for AI Insights (optional) |

## Connecting Whoop

1. At developer.whoop.com, register the redirect URI: `<your-host>/api/whoop/callback`
2. Click **Connect Whoop** on the dashboard, authorize, then **Sync Whoop**.

First sync pulls 60 days of recovery, sleep, strain, and workouts. Click Sync any time.

## Deploying to Vercel

1. Push to GitHub (private repo is fine).
2. Vercel → New Project → import the repo.
3. Add env vars under **Project Settings → Environment Variables**:
   - `DATABASE_URL` (the Neon connection string)
   - `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`
   - `WHOOP_REDIRECT_URI` = `https://<your-vercel-domain>/api/whoop/callback`
   - `ANTHROPIC_API_KEY`
4. Deploy.
5. Update the Whoop redirect URI in the Whoop developer dashboard to match the Vercel URL.

Schema migrations run automatically on the first DB call (idempotent `CREATE TABLE IF NOT EXISTS`).

## Files

- `app/` — Next.js App Router pages and API routes
- `lib/db.ts` — Neon Postgres client + schema migrations
- `lib/targets.ts` — Calorie/protein math (Katch-McArdle)
- `lib/whoop.ts` — OAuth + API client + sync + de-dupe
- `lib/insights.ts` — Anthropic call
- `lib/redFlags.ts` — Whoop-data warning detection
- `lib/schedule.ts` — Weekly calendar + smart "what's tomorrow" recommendation
- `lib/workoutPlan.ts` — 5-day Push/Pull/Legs/Upper/Legs split templates
