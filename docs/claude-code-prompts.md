# Claude Code — Step-by-Step Migration Prompts

## How to Use

1. Commit all files from this package to your GitHub repo
1. Go to claude.ai/code, connect your repo
1. Run ONE prompt at a time — wait for it to finish and test before moving on
1. Each prompt is small enough to stay within Claude Code limits
1. Claude Code reads CLAUDE.md automatically for context

-----

## PHASE 1: Foundation (Steps 1–3)

Install Tailwind, set up routing, create shared components.
Nothing visual changes yet — just infrastructure.

-----

### Step 1 — Install Tailwind CSS

```
Read CLAUDE.md for context.

Install Tailwind CSS in this Vite + React project. Steps:
1. npm install -D tailwindcss @tailwindcss/vite
2. Configure the Vite plugin in vite.config.js
3. Create a tailwind.config.js with the color tokens from CLAUDE.md
   (bg, surface, alt, accent, free, success, error, text, dim, line — both light and dark values)
4. Enable dark mode with "class" strategy
5. Add DM Sans font import to index.html (keep Bebas Neue too)
6. Create src/index.css with @tailwind base/components/utilities
7. Import src/index.css in main.jsx

Do NOT modify any existing components. Just install and configure.
Test: run npm run dev and confirm the app still works.
```

-----

### Step 2 — Install React Router

```
Read CLAUDE.md for context.

Install react-router-dom in this project:
1. npm install react-router-dom
2. In main.jsx, wrap <App /> with <BrowserRouter>
3. Do NOT change App.jsx routing yet — just install the dependency

Test: run npm run dev, confirm app still loads normally.
```

-----

### Step 3 — Create new shared UI components

```
Read CLAUDE.md and look at docs/wireframes/01-home-league-freeplay.jsx
for exact visual specs.

Create a new file: src/components/ui-new.jsx

Build these Tailwind-based components (keep the old ui.jsx untouched for now):

1. AppCard — div with className for bg-surface, rounded-xl, border border-line, p-3
   Props: children, className, onClick, gradient (boolean)

2. AppBadge — small pill span
   Props: text, variant ("accent"|"free"|"success"|"dim"|"error")

3. AppButton — full-width CTA button, min-h-[44px]
   Props: children, onClick, variant ("accent"|"free"|"success"|"error"|"outline"), disabled

4. SectionLabel — uppercase 12px tracking-wide label
   Props: children, color

5. BottomNav — fixed bottom tab bar
   Props: items (array of {id, icon, label}), active, onChange

6. IconButton — 38x38 rounded-xl button for header icons
   Props: children (icon), onClick, badge (number, optional)

Use Tailwind classes. Support dark mode with dark: prefix.
Do NOT modify any existing files.
```

-----

## PHASE 2: New Screens — Shell Only (Steps 4–8)

Build the NEW screens as empty shells with layout + navigation.
No data wiring yet — just the visual structure.

-----

### Step 4 — Home screen shell

```
Read CLAUDE.md and look at docs/wireframes/01-home-league-freeplay.jsx
(the Home screen) and docs/wireframes/06-notifications.jsx for the header.

Create src/pages/Home.jsx:
- Header with "Welcome back" + user name + bell icon (with badge) + gear icon
- League card placeholder (hardcoded data for now)
- Free Play button (teal themed)
- Recent activity list (2-3 hardcoded items)
- BottomNav with Home (active) and Profile tabs

Use the new UI components from ui-new.jsx and Tailwind classes.
Match the wireframe exactly for colors, spacing, font sizes.

Do NOT integrate with App.jsx routing yet. Just create the file.
```

-----

### Step 5 — Profile screen shell

```
Read docs/wireframes/05-profile-settings.jsx (Profile section).

Create src/pages/Profile.jsx:
- Avatar with gradient background + name
- Stats grid (3 columns: Matches, Wins, Win Rate — hardcoded)
- Pill tabs: Stats | Leagues | Matches
- Stats tab: detail stats + performance averages (hardcoded)
- Leagues tab: league cards with rank, W/L (hardcoded)
- Matches tab: match history list with WIN/LOSS badges (hardcoded)
- BottomNav with Home and Profile (active) tabs

Use Tailwind. Match wireframe exactly. No data wiring yet.
```

-----

### Step 6 — Settings screen shell

```
Read docs/wireframes/05-profile-settings.jsx (Settings section).

Create src/pages/Settings.jsx:
- Back arrow header with "Settings" title
- Appearance section: Dark Mode toggle switch
- Notifications section: Match Reminders, Tournament Updates, League Invites toggles
- Account section: Edit Profile, Email, Change Password rows with arrows
- Danger zone: Log Out, Delete Account (red icons)

Use Tailwind. Create a Toggle component inline or in ui-new.jsx.
All toggles are visual only — no functionality yet.
```

-----

### Step 7 — Notification panel component

```
Read docs/wireframes/06-notifications.jsx.

Create src/components/NotificationPanel.jsx:
- Drops down from top with dark backdrop overlay
- Header: "Notifications" + "Mark all read" link
- List of notification items (hardcoded 5 items):
  - Match starting soon (🏐)
  - Tournament result (🏆)
  - League invite (🤝)
  - Ranking update (📈)
  - New match scheduled (📋)
- Each item: emoji icon, title, description, time ago, unread dot
- Unread items have highlighted background
- Tap backdrop to close

Props: isOpen, onClose
Use Tailwind. Match wireframe exactly.
```

-----

### Step 8 — League Detail screen shell

```
Read docs/wireframes/01-home-league-freeplay.jsx (the League screen).

Create src/pages/LeagueDetail.jsx:
- Back arrow header with league name + season
- Rankings list (5 hardcoded players with rank, avatar initial, name, points)
- Current user row highlighted
- Tournaments list (2 hardcoded: one "In Progress", one "Completed")
- "+ New" button next to Tournaments label
- BottomNav: Rankings (active) | Players | Tournaments | Settings

Use Tailwind. Match wireframe. No data wiring yet.
```

-----

## PHASE 3: Connect Routing (Steps 9–10)

Wire up React Router to connect all screens.

-----

### Step 9 — Set up React Router routes

```
Read CLAUDE.md for the target navigation hierarchy.

Restructure the app routing:

1. Create src/layouts/MainLayout.jsx — wrapper with BottomNav for Home/Profile
2. Create src/layouts/LeagueLayout.jsx — wrapper with league BottomNav

3. In App.jsx (or a new Router file), set up routes:
   - "/" → Home.jsx
   - "/profile" → Profile.jsx
   - "/settings" → Settings.jsx
   - "/free-play" → (placeholder for now, just show text "Free Play")
   - "/league/:id" → LeagueDetail.jsx
   - "/league/:id/tournament/:tid" → (placeholder)
   - "/league/:id/tournament/:tid/match/:mid" → (placeholder)

4. Keep ALL existing state and logic in App.jsx for now.
   The old components still work — we're just adding new routes alongside them.

Do NOT remove any existing components or logic.
Test: npm run dev — new routes should work, old app logic still available.
```

-----

### Step 10 — Wire Home screen to real data

```
Now connect the Home screen to real data from the app:

1. In Home.jsx, import the players, tournaments, and freePlays data
   from the app state (pass via props or context — whichever is simpler)

2. Replace hardcoded league card with real tournament data:
   - Show the most recent active tournament as the "league card"
   - Show real player count, match count, W/L record

3. Replace hardcoded recent activity with real data:
   - Recent completed matches from tournaments
   - Recent free play sessions

4. Free Play button should navigate to /free-play using React Router

5. Bell icon opens NotificationPanel (use isOpen state)
6. Gear icon navigates to /settings

Keep all data shapes exactly as they are. Only read from them.
```

-----

## PHASE 4: Restyle Existing Screens (Steps 11–14)

Replace inline styles with Tailwind on existing components, one at a time.

-----

### Step 11 — Restyle the live match flow (Part 1: Setup)

```
Read docs/wireframes/03-live-match.jsx (screens 1 and 2).

Restyle these existing components to match the wireframe:

1. GameSetupScreen.jsx — "Start a Game" screen
   - Team selector cards with avatar initial + team name + player names
   - Sets per match toggle (1 set / Best of 3 / Best of 5)
   - VS divider
   - Start Game CTA button

2. The serve order / match setup portion of LiveScoreSection.jsx
   - Serve orders side by side (two columns)
   - First serve selector
   - Court side selector
   - Serve rotation preview (horizontal pill flow)
   - Start Match CTA

Replace all inline styles and G.* color references with Tailwind classes.
KEEP all useState, event handlers, and game logic EXACTLY as they are.
Only change the JSX markup and styling.
```

-----

### Step 12 — Restyle the live match flow (Part 2: Scoreboard)

```
Read docs/wireframes/03-live-match.jsx (screens 3, 4, 5).

Restyle these existing components:

1. ScoreBoard.jsx — dark scoreboard card with large score numbers,
   serving indicator, "if scores" prediction, sets count

2. PointButtons.jsx — two +1 buttons (teal + accent), undo + end row

3. The point type modal in LiveScoreSection.jsx — bottom sheet with
   Ace, Spike, Block, Tip, Rival Error grid

4. The "who scored" modal — bottom sheet with player cards + Skip

5. PointLog.jsx — history list with score, event, server name, team badge

Replace inline styles with Tailwind. KEEP all logic intact.
The scoreboard card should always use dark background for contrast.
```

-----

### Step 13 — Restyle GameStats (match result)

```
Read docs/wireframes/04-match-result.jsx.

Restyle GameStats.jsx to match the wireframe. It should have pill tabs:

1. Overview tab: Winner banner (dark card with trophy), per-set scores,
   total points comparison, best streak per team, player stats table

2. Stats tab: Points by type with comparison bars,
   serve efficiency cards (serving vs receiving + percentage)

3. History tab: Full point-by-point log with score, event, server, team badge

The component already calculates all this data — just change the JSX layout.
KEEP all stat calculation logic exactly as it is.
Replace inline styles with Tailwind.
```

-----

### Step 14 — Restyle tournament and free play screens

```
Restyle the remaining existing components to match the wireframe design:

1. TournamentsSection.jsx — tournament list cards
2. TournamentTeamsSection.jsx — team cards with player chips
3. TournamentMatchesSection.jsx — match schedule with status badges
4. PlayersSection.jsx — player list with level badges
5. FreePlaysSection.jsx — free play list
6. FreePlayTeamsSection.jsx — free play team cards
7. FreePlayGamesSection.jsx — games list with scores

For each: replace inline styles and G.* references with Tailwind classes.
Use AppCard, AppBadge, AppButton from ui-new.jsx where appropriate.
KEEP all state, logic, and data flow intact.
```

-----

## PHASE 5: Polish (Step 15)

Final cleanup, dark mode, remove old styles.

-----

### Step 15 — Dark mode + cleanup

```
1. Add a dark mode toggle that works:
   - Store preference in localStorage
   - Add/remove "dark" class on <html> element
   - Connect to the Settings page toggle

2. Remove the old ui.jsx file (G palette, old Card/Btn/Badge):
   - Search for all imports from "./ui" or "../components/ui"
   - Replace with imports from "./ui-new" or Tailwind classes
   - Remove the <style>{globalStyle}</style> from App.jsx
   - Delete src/components/ui.jsx

3. Remove the old globalStyle injection

4. Clean up any remaining inline styles

5. Test all screens in both light and dark mode

6. Verify all match flows still work:
   - Create tournament → add teams → generate matches → play live → see stats
   - Create free play → add teams → play → see results
```

-----

## Tips

- **Run one step at a time.** Test after each step before moving on.
- **If something breaks**, tell Claude Code: “The last change broke [specific thing]. Revert only that part and fix it.”
- **If styling doesn’t match**, say: “Compare [component] with docs/wireframes/[file].jsx — the [specific element] doesn’t match. Fix it.”
- **Golden rule in every prompt:** Claude Code reads CLAUDE.md automatically. The rules about what NOT to modify are there.
- **You can always go back to the current app** by reverting the git branch.