# Arenix

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&labelColor=20232a)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)
![Vercel](https://img.shields.io/badge/deployed-Vercel-black?logo=vercel)

**Beach volleyball tournament manager** — built for real use on the court, not as a demo.

**[→ Live demo](https://arenix-two.vercel.app/)**

---

## What it does

Arenix lets you run beach volleyball leagues from your phone. You create a league, invite players, set up tournaments with group stages and knockouts, and score matches live — all without paper or spreadsheets.

It started as a tool I actually needed. It's now used by real players across multiple leagues.

---

## Features

- **League management** — create leagues, invite members via QR code or link, manage roles (admin, scorer, viewer)
- **Tournament setup** — group stage + knockout bracket generation, configurable team sizes and scoring rules
- **Live scoring** — real-time scoreboard with serve rotation tracking, point log, and undo support
- **Crash recovery** — match state persists in localStorage so a phone lock or accidental close never loses a game
- **Free play mode** — casual sessions outside tournaments, with stats tracking
- **ELO rankings** — player ratings calculated and updated after each tournament
- **PWA** — installable on Android and iOS, works from the browser with no app store required

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + React Router 7 |
| Styling | Tailwind CSS v4 (no PostCSS — via `@tailwindcss/vite`) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Deployment | Vercel |

---

## Architecture

The project follows a strict layered architecture to keep concerns separated:

```
src/
├── services/     ← all Supabase reads/writes (single responsibility)
├── hooks/        ← stateful flows that consume services
├── pages/        ← route-level components, orchestration only
├── components/   ← UI components, purely presentational
├── contexts/     ← AuthContext, ToastContext
└── lib/          ← supabase client, utilities, ranking math
```

**Key decisions:**

**Services layer.** Every Supabase call lives in `src/services/`. Pages and components never touch the DB client directly. This means DB changes (schema, policies, table names) are isolated to one layer.

**Hooks wrap services.** Complex flows like live scoring (`useLiveGame`) or free play sessions (`useFreePlay`) live in hooks that consume services and expose clean state to the UI. No business logic in components.

**`useLiveGame` — crash recovery.** The live match hook is split into four focused sub-hooks (`Setup`, `Scoring`, `Undo`, `Persistence`). The `Persistence` sub-hook continuously syncs match state to localStorage so any interruption — phone lock, browser crash, accidental navigation — is fully recoverable when the user returns.

**Row Level Security.** All authorization is enforced at the database level via Supabase RLS policies. Every table has policies that verify `auth.uid()` against league membership and role before allowing reads or writes. The frontend never trusts itself to be the last line of defense.

---

## Local setup

```bash
# 1. Clone and install
git clone https://github.com/SantiagoMorelli/arenix.git
cd arenix
npm install

# 2. Set up environment
cp .env.example .env
# Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Set up the database
# Fresh DB: run supabase/schema.sql in your Supabase SQL Editor
# Existing DB: run files in supabase/migrations/ in order

# 4. Start the dev server
npm run dev
```

---

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run preview  # preview the build locally
npm run lint     # ESLint
```
