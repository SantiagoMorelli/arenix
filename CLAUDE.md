# Arenix — Beach Volleyball Tournament Manager

## Tech Stack

- **Frontend:** React 19.2.4 + Vite 8
- **Styling:** Tailwind CSS 4.2 with CSS custom properties (dark/light mode via class strategy)
- **Data:** Supabase (PostgreSQL + Auth) — services in `src/services/`; legacy localStorage via `useLocalStorage` hook kept for fallback
- **Routing:** React Router DOM 7.14.1 — routes declared in `src/AppRouter.jsx`
- **Auth:** Supabase Auth (email/password + Google OAuth) — state in `src/contexts/AuthContext.jsx`
- **Font:** DM Sans (body) + Bebas Neue (display) via Google Fonts
- **Target:** Mobile-first PWA (320–428px, used on phones via browser)
- **Deployment:** Vercel with SPA rewrite (`vercel.json`)

---

## File Structure

```
src/
├── main.jsx                        ← Entry point (BrowserRouter + AuthProvider)
├── index.css                       ← Tailwind imports + CSS variables (color tokens, fonts)
├── App.jsx                         ← LEGACY: State-based app (preserved, mounted at /legacy/*)
├── AppRouter.jsx                   ← NEW: React Router route declarations
│
├── contexts/
│   └── AuthContext.jsx             ← Auth state (session, profile, loading, signOut, isSuperAdmin, canCreateLeague)
│
├── layouts/
│   ├── MainLayout.jsx              ← Shell for / and /profile (bottom nav: Home | Profile)
│   └── LeagueLayout.jsx            ← Shell for /league/:id routes (nested outlet)
│
├── pages/
│   ├── Home.jsx                    ← Dashboard: league card, free play button, recent activity
│   ├── Login.jsx                   ← Email/password + Google OAuth
│   ├── Signup.jsx                  ← New account creation
│   ├── Profile.jsx                 ← User stats, leagues, match history [PARTIAL]
│   ├── Settings.jsx                ← Dark mode, notifications, account, logout [PARTIAL]
│   ├── LeagueDetail.jsx            ← League: rankings, tournaments, members, settings [IN PROGRESS]
│   ├── TournamentDetail.jsx        ← Tournament: standings, matches, players tabs [IN PROGRESS]
│   ├── TournamentSetupWizard.jsx   ← Tournament creation: players → teams → schedule [PARTIAL]
│   ├── LiveMatch.jsx               ← Live match route [PLANNED]
│   └── JoinLeague.jsx              ← Accept invite via /join/:code [PLANNED]
│
├── components/
│   ├── ui-new.jsx                  ← NEW Tailwind UI primitives (AppCard, AppBadge, AppButton, SectionLabel, BottomNav, IconButton)
│   ├── ProtectedRoute.jsx          ← Auth guard; redirects to /login?next=<path>
│   ├── NotificationPanel.jsx       ← Bell dropdown (currently hardcoded data)
│   │
│   ├── [LEGACY — original state-based components, do not restyle without migrating logic]
│   ├── PlayersSection.jsx          ← Player list + add/edit
│   ├── TournamentsSection.jsx      ← Tournament list + create modal
│   ├── TournamentTeamsSection.jsx  ← Team management within tournament
│   ├── TournamentMatchesSection.jsx← Match schedule
│   ├── GroupStageSection.jsx       ← Group stage bracket view
│   ├── KnockoutStageSection.jsx    ← Knockout bracket view
│   ├── LiveScoreSection.jsx        ← Live match orchestrator (uses useLiveGame)
│   ├── GameSetupScreen.jsx         ← Pre-match setup (serve order, sides)
│   ├── ScoreBoard.jsx              ← Live score display
│   ├── PointButtons.jsx            ← +1 team buttons during match
│   ├── PointLog.jsx                ← Point history log
│   ├── GameStats.jsx               ← Post-match stats (winner, points by type, streaks)
│   ├── InformalWizard.jsx          ← Ad-hoc match wizard
│   ├── FreePlaysSection.jsx        ← Free play list + create
│   ├── FreePlayTeamsSection.jsx    ← Teams within free play
│   ├── FreePlayGamesSection.jsx    ← Games within free play
│   └── FreePlayGameSetup.jsx       ← Free play match setup
│
├── hooks/
│   ├── useLiveGame.js              ← Core match logic (374 lines) — serve rotation, scoring, undo, sets ⛔ DO NOT MODIFY
│   ├── useLocalStorage.js          ← localStorage JSON wrapper ⛔ DO NOT MODIFY
│   ├── useLeague.js                ← Fetch league + nested data from Supabase
│   └── useLeagueRole.js            ← Check user role + permissions in a league [IN PROGRESS]
│
├── services/
│   ├── leagueService.js            ← getMyLeagues(), getLeagueById(), createLeague(), deleteLeague(), leaveLeague()
│   ├── playerService.js            ← addPlayer(), updatePlayer(), deletePlayer(), getLeaguePlayers()
│   ├── tournamentService.js        ← createTournament(), saveMatchResult(), advanceKnockoutAfterMatch(), completeTournament()
│   ├── freePlayService.js          ← Free play queries [IN PROGRESS]
│   └── inviteService.js            ← League invite handling [PLANNED]
│
├── lib/
│   ├── i18n.js                     ← Translation keys (English only) ⛔ DO NOT MODIFY
│   ├── utils.js                    ← uid(), now(), LEVELS, advanceKnockout(), saveMatchResult() ⛔ DO NOT MODIFY
│   ├── supabase.js                 ← Supabase client (validates env vars on init)
│   └── migration.js                ← localStorage v1→v2 data migration
│
└── assets/
    └── hero.png                    ← Hero image

docs/
└── wireframes/
    ├── 01-home-league-freeplay.jsx ← Home, League, Tournament overview, Free Play
    ├── 02-tournament-setup-live.jsx← Tournament setup wizard + live standings view
    ├── 03-live-match.jsx           ← Serve setup, scoreboard, in-match modals
    ├── 04-match-result.jsx         ← Post-match stats + efficiency
    ├── 05-profile-settings.jsx     ← Profile tabs + Settings sections
    ├── 06-notifications.jsx        ← Bell icon + notification dropdown
    └── claude-code-prompts.md      ← 15-step migration implementation roadmap

supabase/
├── schema.sql                      ← Full DB schema with RLS policies
├── add_can_create_league.sql       ← Migration: can_create_league permission
└── add_leave_policies.cjs          ← Migration: leave-league RLS policies

public/
├── icons.svg                       ← SVG icon sprite
└── favicon.svg
```

---

## Routes (AppRouter.jsx)

```
Public:
  /login              → Login
  /signup             → Signup

Protected — MainLayout (bottom nav: Home | Profile):
  /                   → Home
  /profile            → Profile

Protected — no nav:
  /settings           → Settings
  /free-play          → Free Play [PLANNED]
  /join/:code         → JoinLeague [PLANNED]

Protected — LeagueLayout:
  /league/:id                              → LeagueDetail
  /league/:id/tournament/new               → TournamentSetupWizard
  /league/:id/tournament/:tid              → TournamentDetail
  /league/:id/tournament/:tid/match/:mid   → LiveMatch [PLANNED]

Legacy:
  /legacy/*           → Original state-based App.jsx (all old functionality intact)
```

---

## Database Schema (Supabase)

Key tables with RLS:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (full_name, avatar_url, is_super_admin, can_create_league) |
| `leagues` | Leagues (name, season, owner_id, invite_code) |
| `league_member_roles` | Membership + roles (admin, moderator, player) |
| `league_member_permissions` | Granular permissions (manage_league, create_tournament, invite_players, score_match, edit_profile) |
| `players` | Per-league player profiles (name, level, wins, losses, points, user_id) |
| `tournaments` | Tournaments (name, date, team_size, sets_per_match, phase, status, winner_team_id) |
| `teams` | Tournament teams (name, wins, losses, points) |
| `team_players` | Team membership |
| `groups` | Group stage groups |
| `group_teams` | Group membership |
| `knockout_rounds` | Knockout bracket rounds |
| `matches` | All matches (score1, score2, winner_id, played, log, sets, source_type) |

---

## Data Models

```javascript
// League (from Supabase)
{
  id: string,
  name: string,
  season: string,
  owner_id: string,
  invite_code: string,
  created_at: timestamp,
  players: Player[],
  tournaments: Tournament[],
  members: LeagueMember[],
}

// Tournament
{
  id: string,
  name: string,
  date: string,
  team_size: number,
  sets_per_match: number,
  phase: 'setup' | 'group' | 'knockout' | 'freeplay' | 'completed',
  status: 'active' | 'completed',
  winner_team_id: string,
  teams: Team[],
  groups: Group[],
  knockout: { rounds: KnockoutRound[] },
  matches: Match[],
}

// Match
{
  id: string,
  team1: string,
  team2: string,
  score1: number,
  score2: number,
  winner: string,
  played: boolean,
  log: PointLog[],   // point-by-point history
  sets: SetScore[],  // multi-set scores
}
```

---

## Design System

### Color Tokens

Defined as CSS variables in `src/index.css` and mapped via `@theme` to Tailwind utilities (`bg-surface`, `text-accent`, etc.).

| Token | Light | Dark |
|-------|-------|------|
| `--c-bg` | `#F5F6F8` | `#0F1923` |
| `--c-surface` | `#FFFFFF` | `#1A2734` |
| `--c-alt` | `#EDF0F4` | `#243447` |
| `--c-accent` | `#E8850C` | `#F5A623` |
| `--c-free` | `#0891B2` | `#00BCD4` |
| `--c-success` | `#16A34A` | `#2ECC71` |
| `--c-error` | `#DC2626` | `#E74C3C` |
| `--c-text` | `#1A1D23` | `#E8ECF1` |
| `--c-dim` | `#6B7280` | `#7A8EA0` |
| `--c-line` | `#E2E5EB` | `#2A3A4A` |

Dark mode uses Tailwind's `selector` strategy: add `dark` class to `<html>` element.

### Layout & Spacing Constants

- **Card:** `rounded-xl` (12px), padding `p-3` (12px) / `px-3.5` (14px), `border border-line`
- **Labels:** `text-xs font-bold uppercase tracking-wide` (12px)
- **Body text:** `text-[13px]`
- **Subtitles:** `text-[11px]`
- **Headers:** `text-lg` (18px)
- **CTAs:** `text-sm` (14px), `w-full rounded-xl min-h-[44px]`
- **Touch targets:** minimum `min-h-[44px]` / `min-w-[44px]`
- **Side padding:** `px-4` (16px)
- **Gap:** `gap-2` (8px)

### UI Primitives (src/components/ui-new.jsx)

| Component | Usage |
|-----------|-------|
| `AppCard` | Surface card with optional gradient, `rounded-xl border-line` |
| `AppBadge` | Pill badge — variants: `accent`, `free`, `success`, `error`, `dim` |
| `AppButton` | Full-width CTA, `min-h-[44px]` — variants: `accent`, `free`, `ghost` |
| `SectionLabel` | Uppercase section header label |
| `BottomNav` | Fixed bottom tab bar with active indicator |
| `IconButton` | 38×38 rounded icon button with optional notification badge |

### Wireframes

All screens have matching wireframes in `docs/wireframes/`. Always reference these for exact visual specs before building a new screen.

---

## Authentication & Permissions

- `AuthContext` provides: `session`, `profile`, `loading`, `signOut()`, `isSuperAdmin`, `canCreateLeague`
- `ProtectedRoute` wraps all authenticated routes; unauthenticated users are redirected to `/login?next=<path>`
- League roles: `admin`, `moderator`, `player`
- Granular permissions: `manage_league`, `create_tournament`, `invite_players`, `score_match`, `edit_profile`
- Use `useLeagueRole(leagueId)` to check current user's role/permissions within a league

---

## Implementation Status

### Complete

- Authentication (email/password + Google OAuth)
- ProtectedRoute + AuthContext
- Home screen (greeting, league card, recent activity, notifications icon)
- Login + Signup screens
- Supabase services: league CRUD, player CRUD, tournament + match saving, knockout advancement
- Live match logic: `useLiveGame` hook, `GameSetupScreen`, `ScoreBoard`, `PointButtons`, `PointLog`, `GameStats`
- Legacy components: all original screens preserved at `/legacy/*`

### In Progress

- `LeagueDetail.jsx` — rankings + tournament list data binding, member management, settings tab
- `TournamentDetail.jsx` — standings bracket, matches with live match integration, players tab
- `TournamentSetupWizard.jsx` — invite players → teams → schedule flow
- `Profile.jsx` — real stats aggregation from Supabase
- `Settings.jsx` — dark mode toggle state persistence, notification prefs backend
- `useLeagueRole.js` — role/permission checking hook

### Planned

- `LiveMatch.jsx` — `/league/:id/tournament/:tid/match/:mid` route wrapping `GameSetupScreen → LiveScoreSection → GameStats`
- `JoinLeague.jsx` — accept invite via `/join/:code`
- Free Play screens — `/free-play` route using existing legacy components
- Real notifications — replace hardcoded `NotificationPanel` data with Supabase queries
- `inviteService.js` — league invite creation + acceptance

---

## Development Workflow

### Environment Setup

```bash
# Copy env template and fill in Supabase credentials
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

### Required Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Both are validated at startup in `src/lib/supabase.js` — the app will throw if missing.

### Git Branch

Feature work goes on `claude/add-claude-documentation-EyUzz`. Push with:

```bash
git push -u origin claude/add-claude-documentation-EyUzz
```

---

## Rules

### NEVER modify

- `src/hooks/useLiveGame.js` — core match state machine (374 lines), volleyball serve rotation, scoring, undo, sets
- `src/hooks/useLocalStorage.js` — localStorage persistence wrapper
- `src/lib/i18n.js` — translation keys
- `src/lib/utils.js` — `uid()`, `now()`, `LEVELS`, `advanceKnockout()`, `saveMatchResult()`
- Game logic functions in `App.jsx`: `saveLiveResult`, `advanceKnockout`, `getAllTournamentMatches`
- Supabase database schema shapes in `supabase/schema.sql` (add migrations instead)

### ALWAYS do

- Use Tailwind utility classes only — no inline styles, no new CSS files
- Support dark mode: every element needs dark-mode variants (use `dark:` prefix)
- Design mobile-first: 320px baseline, max 428px for phone layout
- Keep all `useState`, `useEffect`, event handlers intact when restyling existing components
- Keep all props and data flow intact — never change a component's external interface
- Reference `docs/wireframes/` for exact visual specs before building any screen
- Use `AppCard`, `AppButton`, `AppBadge`, `SectionLabel` from `ui-new.jsx` for new screens
- All touch targets must be at least 44px tall/wide
- Wrap all new page-level routes in `<ProtectedRoute>` (except `/login` and `/signup`)
- All Supabase queries go in `src/services/` — never query Supabase directly from components

### Pattern: Adding a new screen

1. Create `src/pages/NewScreen.jsx`
2. Add route in `src/AppRouter.jsx` wrapped in `<ProtectedRoute>`
3. Build UI with Tailwind classes matching the wireframe in `docs/wireframes/`
4. Fetch data via a service in `src/services/` or hook in `src/hooks/`
5. Test on mobile viewport (375px)
