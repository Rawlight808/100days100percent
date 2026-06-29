# 100 Days of 100%

An all-or-nothing daily habit challenge. Pick the habits that matter, complete
**every one of them every day for 100 days**, and miss a single day — you start
over at Day 1.

Built with React + TypeScript + Vite, with Supabase for auth and data, deployed
on Vercel.

## How it works

1. **Setup** — write 100 things that would improve your life.
2. **Select** — choose 10–20 of them as your daily list.
3. **Run** — check off all of them every day. A day rolls over at **4:00 AM**
   local time. Miss a day and your streak resets to Day 1.

### Features

- **Streaks** with automatic day rollover and missed-day detection.
- **Sabbath** — one rest day per calendar week, unlocked after 3 perfect days.
- **Caveats** — attach a temporary exception to a rule. One per calendar week
  (resets Sunday); it deactivates automatically when the week is over. Synced
  across devices.
- **Daily journal** with a browsable calendar of past entries.
- **Editing** a habit is allowed only after completing it 3 days in a row.
- **Deadline reminders** and a configurable daily reminder (browser
  notifications).
- **Account deletion** — permanently remove your account and all data in-app.

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **React Router** for routing
- **Supabase** (Postgres + Auth) via `@supabase/supabase-js`
- **dnd-kit** for drag-to-reorder
- Deployed on **Vercel** (SPA rewrite in `vercel.json`)

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Supabase values
npm run dev
```

### Environment variables

| Variable                 | Description                          |
| ------------------------ | ------------------------------------ |
| `VITE_SUPABASE_URL`      | Your Supabase project URL            |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key             |
| `VITE_SITE_URL`          | Public site URL (used for OG + auth) |

## Database

SQL migrations live in `supabase/migrations/` and are applied in numeric order.
Run each new migration in your Supabase project's SQL editor (or via the
Supabase CLI). Tables use row-level security so each user can only read and
write their own rows.

## Scripts

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start the dev server              |
| `npm run build`   | Type-check and build for prod     |
| `npm run preview` | Preview the production build      |
| `npm run lint`    | Run ESLint                        |

## Installing as an app

The app ships a web manifest and is installable on mobile/desktop via the
browser's **Add to Home Screen** / **Install** option, where it runs
full-screen with safe-area handling for modern phones.
