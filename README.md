# Fitness Tracker

Personal calorie / workout / body-comp tracker with Whoop integration and AI coaching.

## Run locally

```bash
cd ~/Desktop/fitness-tracker
npm install
npm run init-db
npm run dev
```

Then open http://localhost:3000

## Connecting Whoop

1. At developer.whoop.com, set the redirect URI of your app to:
   `http://localhost:3000/api/whoop/callback`
2. Click **Connect Whoop** on the dashboard.
3. After authorizing, hit **Sync Whoop** to pull recovery, sleep, strain, and workouts.

The first sync grabs the last 60 days. After that, click **Sync Whoop** whenever you want fresh data.

## AI insights

Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env.local` and restart `npm run dev`.
The Insights page calls Claude Haiku once per click (cheap, credits-conscious).

## Deploying so you can hit it from your phone

**Easiest (free):** push this repo to GitHub, deploy on Vercel.
- SQLite won't work on Vercel serverless. Swap to Postgres:
  - Use Vercel Postgres or Neon (free tier).
  - Replace `better-sqlite3` calls in `lib/db.ts` with a Postgres client (`pg` or `@neondatabase/serverless`). Schema translates 1:1 except change `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`, `TEXT DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMPTZ DEFAULT NOW()`.
- Set the Whoop redirect URI to your deployed URL + `/api/whoop/callback`.

**Easier alternative — keep it local, access from phone:**
- On the same Wi-Fi: run `npm run dev` and visit `http://<your-mac-ip>:3000` from your phone.
- Anywhere: install Tailscale on Mac + phone, hit your Mac's tailnet IP. Or use `ngrok http 3000` for a public URL.

## Files

- `app/` — Next.js App Router pages and API routes
- `lib/db.ts` — SQLite + migrations
- `lib/targets.ts` — Calorie/protein math (Katch-McArdle)
- `lib/whoop.ts` — OAuth + API client + sync
- `lib/insights.ts` — Anthropic call
- `data/fitness.db` — SQLite file (gitignored)
