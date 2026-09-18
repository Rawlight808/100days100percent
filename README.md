# 100 Days of 100%

An all-or-nothing daily habit challenge. Pick the habits that matter, complete
**every one of them every day for 100 days**, and miss a single day — you start
over at Day 1.

Built with React + TypeScript + Vite, with Supabase for auth and data, deployed
on Vercel.

## How it works

1. **Goals** — walk every life area (money, health, fitness, diet, relationships,
   education, faith, craft, and other). Say where you want to be in 100 days,
   then answer questions that uncover things to do and things to stop.
2. **100 list** — those answers become your 100 items.
3. **Select** — choose 10–20 of them as your daily list.
4. **Run** — check off all of them every day. A day rolls over at **4:00 AM**
   local time. Miss a day and your streak resets to Day 1.

### Features

- **Guided setup** — destinations and question prompts per life area, with
  tap-to-add examples for fitness and diet.
- **Streaks** with automatic day rollover and missed-day detection.
- **Sabbath** — one rest day per calendar week, unlocked after 3 perfect days.
- **Caveats** — attach a temporary exception to a rule. You earn one each
  Sunday; unused ones bank and carry over. An attached caveat deactivates
  automatically when the week is over. Synced across devices.
- **Exceptions** — a rare, whole-day exemption for circumstances outside your
  control (sickness, family emergency, extreme work day, all-day travel).
  Freezes the streak: the day doesn't count toward the 100, but you don't
  reset. 5 per run; claimable for today, or retroactively for yesterday from
  the failed screen. Requires a reason (pick a category, write a note, or both).
- **Daily journal** with a browsable calendar of past entries. Journal
  history now survives restarts.
- **Editing** a habit is allowed only after completing it 3 days in a row.
- **Deadline reminders** and a configurable daily reminder (browser
  notifications).
- **Coach sharing** — opt in to share your selected habit list with the coach
  (admin), or keep it private (the default). Journals are never shared.
- **Admin panel** — the coach can see all users and the day they're on, view
  shared habit lists, and override a user's challenge day.
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

Guided setup needs `012_goals.sql` (`goals` table plus `items.area` /
`items.kind`). Apply it in the SQL editor if you have not already.

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
