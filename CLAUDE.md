# Arenix — Beach Volleyball Tournament Manager

## Tech Stack

- **Frontend:** React 19 + Vite 8 (standard web app, NOT React Native)
- **Styling:** Inline styles + `G` palette in `src/components/ui.jsx` → migrating to Tailwind CSS
- **Data:** localStorage via `useLocalStorage` hook (no Supabase yet)
- **Routing:** No React Router — all navigation via state in App.jsx
- **Font:** DM Sans + Bebas Neue (Google Fonts)
- **Target:** Mobile-first PWA (mostly used on phones via browser)

## Current File Structure

```
src/
├── App.jsx                          ← Main app, all routing logic, state management
├── main.jsx                         ← Entry point
├── assets/                          ← Images (hero.png, etc.)
├── components/
│   ├── ui.jsx                       ← Shared palette (G), Card, Btn, Badge, Input, Select, Modal
│   ├── PlayersSection.jsx           ← Player list + add/edit
│   ├── TournamentsSection.jsx       ← Tournament list + create modal
│   ├── TournamentTeamsSection.jsx   ← Teams management within tournament
│   ├── TournamentMatchesSection.jsx ← Schedule/matches within tournament
│   ├── GroupStageSection.jsx        ← Group stage bracket
│   ├── KnockoutStageSection.jsx     ← Knockout bracket
│   ├── LiveScoreSection.jsx         ← Live match orchestrator (uses useLiveGame)
│   ├── GameSetupScreen.jsx          ← Pre-match setup (serve order, sides)
│   ├── ScoreBoard.jsx               ← Score display during match
│   ├── PointButtons.jsx             ← +1 team buttons
│   ├── PointLog.jsx                 ← Match history log
│   ├── GameStats.jsx                ← Post-match stats (winner, points by type, etc.)
│   ├── InformalWizard.jsx           ← Informal/ad-hoc match wizard
│   ├── FreePlaysSection.jsx         ← Free play list + create
│   ├── FreePlayTeamsSection.jsx     ← Teams within free play
│   ├── FreePlayGamesSection.jsx     ← Games list within free play
│   └── FreePlayGameSetup.jsx        ← Free play match setup
├── hooks/
│   ├── useLiveGame.js               ← Core match logic (374 lines) — serve rotation, scoring, undo, sets
│   └── useLocalStorage.js           ← localStorage wrapper
└── lib/
    ├── i18n.js                      ← Translation keys (English only)
    └── utils.js                     ← uid(), now(), LEVELS
```

## Current Navigation (state-based in App.jsx)

```
Global tabs (GLOBAL_NAV):
  "tournaments" → TournamentsSection
  "freeplay"    → FreePlaysSection
  "players"     → PlayersSection

Inside tournament (TOUR_NAV, activated by activeTournamentId):
  "tour_live"    → LiveScoreSection
  "tour_matches" → TournamentMatchesSection
  "tour_teams"   → TournamentTeamsSection
  "tour_players" → PlayersSection (contextual)

Inside free play (FP_NAV, activated by activeFreePlayId):
  "fp_live"    → LiveScoreSection or FreePlayGameSetup
  "fp_games"   → FreePlayGamesSection
  "fp_teams"   → FreePlayTeamsSection
  "fp_players" → PlayersSection (contextual)
```

## Target Navigation (new — with React Router)

```
/ → Home (NEW screen)
    Header: 🔔 Bell (notifications) + ⚙️ Gear (settings)
    Bottom nav: Home | Profile
    Shows: League card, Free Play button, Recent activity

/league/:id → League Detail (NEW — wraps existing tournament concept)
    Bottom nav: Rankings | Players | Tournaments | Settings

/league/:id/tournament/:tid → Tournament Detail
    NO bottom nav, back arrow → League
    Setup wizard: Players → Teams → Schedule
    Live view tabs: Standings | Matches | Players

/league/:id/tournament/:tid/match/:mid → Live Match
    NO bottom nav, back arrow → Tournament
    Flow: GameSetupScreen → LiveScoreSection → GameStats

/free-play → Free Play (RESTYLE existing)
    NO bottom nav, back arrow → Home

/profile → Profile (NEW)
    Tabs: Stats | Leagues | Matches
    Bottom nav: Home | Profile

/settings → Settings (NEW, pushed from gear icon)
    Sections: Appearance | Notifications | Account
```

-----

## Screen Status (What Exists vs What’s New)

### EXISTS — Restyle only (keep all logic):

- `LiveScoreSection.jsx` — Live match orchestrator
- `GameSetupScreen.jsx` — Serve order, sides, first serve
- `ScoreBoard.jsx` — Score display
- `PointButtons.jsx` — +1 buttons
- `PointLog.jsx` — Match history
- `GameStats.jsx` — Post-match stats
- `PlayersSection.jsx` — Player management
- `TournamentsSection.jsx` — Tournament list
- `TournamentTeamsSection.jsx` — Team management
- `TournamentMatchesSection.jsx` — Match schedule
- `GroupStageSection.jsx` — Group brackets
- `KnockoutStageSection.jsx` — Knockout brackets
- `FreePlaysSection.jsx` — Free play list
- `FreePlayTeamsSection.jsx` — Free play teams
- `FreePlayGamesSection.jsx` — Free play games
- `FreePlayGameSetup.jsx` — Free play match setup
- `InformalWizard.jsx` — Ad-hoc match wizard

### NEW — Build from scratch:

- Home screen (dashboard with league card, free play, recent)
- League Detail screen (rankings, players, tournaments tabs)
- Tournament Setup wizard (invite players, auto/manual teams, schedule)
- Profile screen (stats, leagues, match history)
- Settings screen (theme, notifications, account)
- Notification panel (bell dropdown)
- Shared UI components (new Tailwind-based replacements for ui.jsx)

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

### NEVER modify:

- `src/hooks/useLiveGame.js` (match logic)
- `src/hooks/useLocalStorage.js` (data persistence)
- Game logic functions in App.jsx: `saveLiveResult`, `advanceKnockout`, `getAllTournamentMatches`
- Data model shapes (tournaments, freePlays, players arrays)
- `src/lib/i18n.js` and `src/lib/utils.js`

### ALWAYS do:

- Keep all useState, useEffect, event handlers intact when restyling
- Keep all props and data flow intact
- Reference docs/wireframes/ for exact visual specs
- Use Tailwind utility classes, not inline styles
- Support dark mode with class strategy
- Design mobile-first (320-428px)