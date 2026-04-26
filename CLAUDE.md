# Arenix — Beach Volleyball Tournament Manager

## Tech Stack

- **Frontend:** React 19 + Vite 8 (standard web app, NOT React Native)
- **Styling:** Tailwind CSS (`ui-new.jsx` for shared components)
- **Data:** Supabase (real-time DB + auth)
- **Routing:** React Router v6 — routes defined in `AppRouter.jsx`
- **Font:** DM Sans + Bebas Neue (Google Fonts)
- **Target:** Mobile-first PWA (mostly used on phones via browser)

## Current File Structure

```
src/
├── AppRouter.jsx                        ← React Router setup, all routes
├── main.jsx                             ← Entry point
├── assets/                              ← Images (hero.png, etc.)
├── contexts/
│   └── AuthContext.jsx                  ← Supabase auth context
├── hooks/
│   ├── useLiveGame.js                   ← Core match logic — serve rotation, scoring, undo, sets
│   ├── useLeague.js                     ← League data fetching
│   ├── useLeagueRole.js                 ← Role/permission check per league
│   ├── useBattery.js                    ← Battery level detection
│   └── useLocalStorage.js              ← localStorage wrapper
├── layouts/
│   ├── MainLayout.jsx                   ← Root layout (nav, auth gate)
│   └── LeagueLayout.jsx                 ← Layout for /league/:id routes
├── lib/
│   ├── i18n.js                          ← Translation keys (English only)
│   ├── utils.js                         ← uid(), now(), LEVELS
│   └── supabase.js                      ← Supabase client
├── pages/
│   ├── Home.jsx                         ← / — dashboard (league card, free play, recent)
│   ├── LeagueDetail.jsx                 ← /league/:id — rankings, players, tournaments tabs
│   ├── TournamentDetail.jsx             ← /league/:id/tournament/:tid
│   ├── TournamentSetupWizard.jsx        ← Tournament creation wizard
│   ├── LiveMatch.jsx                    ← /league/:id/tournament/:tid/match/:mid ← MAIN LIVE MATCH
│   ├── Profile.jsx                      ← /profile
│   ├── EditProfile.jsx                  ← /profile/edit
│   ├── Settings.jsx                     ← /settings
│   ├── Login.jsx                        ← /login
│   ├── Signup.jsx                       ← /signup
│   └── JoinLeague.jsx                   ← /join/:code
└── components/
    ├── ui-new.jsx                       ← Shared Tailwind components
    ├── GameStats.jsx                    ← Post-match stats (used by LiveMatch + TournamentDetail)
    ├── LeaguePlayersTab.jsx             ← Players tab inside LeagueDetail
    ├── TournamentStatsScreen.jsx        ← Tournament statistics overlay
    ├── NotificationPanel.jsx            ← Bell dropdown
    ├── NotificationToast.jsx            ← Toast notifications
    ├── ProtectedRoute.jsx               ← Auth guard wrapper
    ├── QRExportModal.jsx                ← QR code export for match handoff
    └── QRImportModal.jsx                ← QR code import
```

## ORPHANED FILES — DO NOT TOUCH

These files exist on disk but are **not imported anywhere** in the active codebase.
They are leftovers from the pre-router architecture. Do not edit them.

- `src/components/LiveScoreSection.jsx`
- `src/components/ScoreBoard.jsx`
- `src/components/GameSetupScreen.jsx`
- `src/components/PointButtons.jsx`
- `src/components/PointLog.jsx`

## Current Navigation (React Router)

```
/                                       → Home.jsx
/login                                  → Login.jsx
/signup                                 → Signup.jsx
/join/:code                             → JoinLeague.jsx
/profile                                → Profile.jsx
/profile/edit                           → EditProfile.jsx
/settings                               → Settings.jsx
/league/:id                             → LeagueDetail.jsx  (inside LeagueLayout)
/league/:id/tournament/new              → TournamentSetupWizard.jsx
/league/:id/tournament/:tid             → TournamentDetail.jsx
/league/:id/tournament/:tid/match/:mid  → LiveMatch.jsx
```

-----

## Screen Status

### ACTIVE — edit these:

- `pages/LiveMatch.jsx` — live match scoreboard (the real one, routed)
- `pages/TournamentDetail.jsx` — tournament view (standings, matches, players)
- `pages/LeagueDetail.jsx` — league view
- `pages/TournamentSetupWizard.jsx` — create tournament flow
- `pages/Home.jsx` — dashboard
- `pages/Profile.jsx` — player profile
- `pages/Settings.jsx` — app settings
- `components/GameStats.jsx` — post-match stats screen
- `components/LeaguePlayersTab.jsx` — player list in league
- `components/NotificationPanel.jsx` — bell dropdown
- `hooks/useLiveGame.js` — all match logic lives here

### ORPHANED — do not edit:

- `components/LiveScoreSection.jsx` — replaced by `pages/LiveMatch.jsx`
- `components/ScoreBoard.jsx` — was used by LiveScoreSection only
- `components/GameSetupScreen.jsx` — was used by LiveScoreSection only
- `components/PointButtons.jsx` — was used by LiveScoreSection only
- `components/PointLog.jsx` — was used by LiveScoreSection only

-----

## Design System

All wireframes in `docs/wireframes/`:

- `01-home-league-freeplay.jsx` — Home, League, Tournament overview, Free Play
- `02-tournament-setup-live.jsx` — Tournament setup wizard + live view
- `03-live-match.jsx` — Start game, match setup, scoreboard, modals
- `04-match-result.jsx` — Post-match stats
- `05-profile-settings.jsx` — Profile + Settings
- `06-notifications.jsx` — Bell icon + dropdown panel

### Color Tokens (configure in tailwind.config.js)

Dark (primary): bg:#0F1923 surface:#1A2734 alt:#243447 accent:#F5A623 free:#00BCD4 success:#2ECC71 error:#E74C3C text:#E8ECF1 dim:#7A8EA0 line:#2A3A4A
Light: bg:#F5F6F8 surface:#FFF alt:#EDF0F4 accent:#E8850C free:#0891B2 success:#16A34A error:#DC2626 text:#1A1D23 dim:#6B7280 line:#E2E5EB

### Design Constants

Card: 12px radius, 12px 14px padding. Labels: 12px uppercase weight-700 tracking-wide.
Body: 13px. Subtitles: 11px. Headers: 18px. CTAs: 14px padding+font, full-width, rounded-xl.
Touch: min 44px. Side padding: 16px. Gaps: 8px.

-----

## Rules

### ALWAYS do:

- Keep all useState, useEffect, event handlers intact when restyling
- Keep all props and data flow intact
- Reference docs/wireframes/ for exact visual specs
- Use Tailwind utility classes, not inline styles
- Support dark mode with class strategy
- Design mobile-first (320-428px)
