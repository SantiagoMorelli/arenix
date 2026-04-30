# Arenix — Beach Volleyball Tournament Manager

Mobile-first PWA used on phones via the browser. Standard React web app, **not** React Native.

## Tech stack

- **React 19** + **Vite 8** (`@vitejs/plugin-react`, `vite-plugin-pwa`)
- **React Router 7** — all routes in `src/AppRouter.jsx`
- **Supabase** (`@supabase/supabase-js`) — real-time DB + auth
- **Tailwind v4** via `@tailwindcss/vite` (no PostCSS step)
- **Fonts:** DM Sans (body/UI) + Bebas Neue (display/scoreboard)
- **Icons:** Lucide React (mandated by the design handoff)
- **QR handoff:** `qrcode.react` + `html5-qrcode`

## Design system

All visual specs — colors, typography, spacing, component primitives, per-screen
layouts, animations — live in **`design_handoff_arenix/README.md`**. Treat that
file as canonical and pixel-match against it. Wireframes and prompt templates
are in `docs/wireframes/` and `docs/claude-code-prompts.md`. Do **not**
duplicate token values into this file; they drift.

## File structure

```
src/
├── AppRouter.jsx                ← all routes
├── main.jsx                     ← entry
├── contexts/AuthContext.jsx     ← Supabase auth context
├── layouts/
│   ├── MainLayout.jsx           ← bottom nav + auth gate
│   └── LeagueLayout.jsx         ← /league/:id/* shell
├── lib/
│   ├── supabase.js              ← single client (env-validated)
│   ├── i18n.js                  ← translation keys (English only)
│   ├── utils.js                 ← uid(), now(), LEVELS
│   └── standings.js             ← ranking math
├── services/                    ← ALL Supabase reads/writes go here
│   ├── leagueService.js
│   ├── tournamentService.js
│   ├── playerService.js
│   ├── freePlayService.js
│   ├── inviteService.js
│   └── notificationService.js
├── hooks/                       ← state-bearing flows; consume services
│   ├── useLiveGame.js           ← serve rotation, scoring, undo, sets
│   ├── useFreePlay.js           ← free-play session state
│   ├── useLeague.js             ← league data fetching
│   ├── useLeagueRole.js         ← role/permission per league
│   ├── useBattery.js
│   └── useLocalStorage.js
├── pages/
│   ├── Home.jsx, GuestHome.jsx               ← / (auth | guest)
│   ├── Login.jsx, Signup.jsx
│   ├── Profile.jsx, EditProfile.jsx, Settings.jsx
│   ├── JoinLeague.jsx                         ← /join/:code
│   ├── LeagueDetail.jsx, LeaguePublicView.jsx ← private vs public read-only
│   ├── TournamentDetail.jsx, TournamentSetupWizard.jsx
│   ├── LiveMatch.jsx                          ← orchestrator (see below)
│   └── FreePlay{List,Wizard,Session,LiveMatch,Join}.jsx
└── components/
    ├── ui-new.jsx               ← shared primitives (Card, Btn, …) — REUSE
    ├── GameSetupScreen.jsx      ← LiveMatch: pre-match setup phase
    ├── LiveScoreboard.jsx, LiveScoreSection.jsx, ScoreBoard.jsx
    ├── PointButtons.jsx, PointLog.jsx, EditMatchModal.jsx
    ├── GameStats.jsx, FreePlayStatsScreen.jsx, TournamentStatsScreen.jsx
    ├── LeaguePlayersTab.jsx
    ├── NotificationPanel.jsx, NotificationToast.jsx
    ├── ProtectedRoute.jsx
    └── QRExportModal.jsx, QRImportModal.jsx
```

## Routes

```
/                                        → Home (auth) | GuestHome (guest)
/login, /signup                          → public
/profile                                 → Profile (auth)
/edit-profile                            → EditProfile
/settings                                → Settings
/join/:code                              → JoinLeague (auth)
/league/view/:code                       → LeaguePublicView (public, read-only)
/league/:id                              → LeagueDetail        ┐
/league/:id/tournament/new               → TournamentSetupWizard│ inside
/league/:id/tournament/:tid              → TournamentDetail     │ LeagueLayout
/league/:id/tournament/:tid/match/:mid   → LiveMatch (auth)    ┘
/free-play                               → FreePlayList
/free-play/new                           → FreePlayWizard
/free-play/:id                           → FreePlaySession
/free-play/:id/match                     → FreePlayLiveMatch
/free-play/join/:code                    → FreePlayJoin (public)
```

## Architectural patterns

- **Services layer.** All Supabase calls live in `src/services/*.js`. Pages,
  components, and hooks must **not** call `supabase.from(...)` directly.
- **Hooks wrap services.** Stateful flows like `useLiveGame` and `useFreePlay`
  consume services and expose UI-friendly state.
- **Layouts.** `MainLayout` wraps authenticated screens with bottom nav;
  `LeagueLayout` wraps everything under `/league/:id/`.
- **LiveMatch composition.** `LiveMatch.jsx` orchestrates phases via
  `GameSetupScreen` → `LiveScoreboard` / `ScoreBoard` / `LiveScoreSection`
  (+ `PointButtons`, `PointLog`, `EditMatchModal`) → `GameStats`. When
  restyling, edit the sub-components, not the orchestrator.

## Rules

- **Lucide React for all icons.** No inline SVGs, no other icon libraries.
- **All Supabase calls go through `src/services/`.** Never import the client
  directly into a page or component.
- **Reuse `components/ui-new.jsx` primitives** (Card, Btn, Avatar, Badge,
  Label, …) before creating new styled elements.
- **Mobile-first (320–428px).** Dark mode is primary; light mode uses the
  Tailwind `class` strategy.
- **No test framework is configured.** Do not scaffold vitest/jest/RTL or
  create test files unless explicitly asked.
- **Restyle, don't rewire.** When changing visuals, keep `useState`,
  `useEffect`, event handlers, and props intact.
- **Tailwind utilities only**, no inline styles.
- For any visual decision, defer to `design_handoff_arenix/README.md`; for
  layout questions, check `docs/wireframes/`.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # production build
npm run lint      # ESLint v9 flat config
npm run preview   # serve the build locally
```

## Known gaps

These are intentional follow-ups, not bugs to fix opportunistically:

- `tailwind.config.js` does **not** yet expose the handoff tokens
  (`theme.extend.colors`, `fontFamily`). Visual work that depends on
  `bg-accent`, `text-dim`, `font-display`, etc. needs these added first.
- `lucide-react` is **not yet a dependency**. Add it before introducing icons.
- DM Sans + Bebas Neue are **not yet imported** in `index.html`.
