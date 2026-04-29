# Handoff: Arenix Mobile App

## Overview
Arenix is a beach volleyball tournament manager. This handoff covers the **Home dashboard** and supporting screens (League, Tournament, Live Match, Profile, Free Play, Notifications, Settings). The goal is to replicate these designs in the existing Arenix codebase (**React 19 + Vite + Tailwind v4**) — pixel-perfect, same colors, same typography, same iconography.

## About the Design Files
The HTML files in this bundle are **design references** — high-fidelity prototypes showing intended look, layout, and interactions. **Do not ship the HTML directly.** Recreate each screen as React components in your existing Arenix codebase, using Tailwind v4 utilities and your existing component patterns (`src/components/ui-new.jsx`).

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are decided. Match exactly.

---

## Design Tokens

Add these to `tailwind.config.js` `theme.extend` (if not already present):

### Colors (dark theme — primary)
```js
colors: {
  bg:      '#0F1923',  // page background
  surface: '#1A2734',  // card background
  alt:     '#243447',  // alternate / inset background
  accent:  '#F5A623',  // primary orange
  free:    '#00BCD4',  // teal (free-play accent)
  ok:      '#2ECC71',  // success / live
  err:     '#E74C3C',  // error / destructive
  text:    '#E8ECF1',  // primary text
  dim:     '#7A8EA0',  // secondary / muted text
  line:    '#2A3A4A',  // borders / dividers
}
```

### Colors (light theme)
```js
bg: '#F5F6F8', surface: '#FFFFFF', alt: '#EDF0F4',
accent: '#E8850C', free: '#0891B2', ok: '#16A34A', err: '#DC2626',
text: '#1A1D23', dim: '#6B7280', line: '#E2E5EB'
```

### Typography
- **Body / UI:** `DM Sans`, weights 400 / 500 / 600 / 700 / 800
- **Display (big numbers, scoreboard, page titles in some screens):** `Bebas Neue`, all weights
- **Mono (rare):** `JetBrains Mono`

Import in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap" rel="stylesheet">
```

In Tailwind:
```js
fontFamily: {
  sans: ['DM Sans', 'system-ui', 'sans-serif'],
  display: ['Bebas Neue', 'Impact', 'sans-serif'],
}
```

### Type scale (used in the prototype)
| Use | Size | Weight | Family |
|---|---|---|---|
| Page title | 17–22px | 700 | DM Sans |
| Section label (UPPERCASE) | 11px | 700, letter-spacing 1.2px | DM Sans |
| Body | 13px | 500–600 | DM Sans |
| Small / meta | 10–11px | 500 | DM Sans |
| Tiny / caption | 9–10px | 600 | DM Sans |
| Big stat numbers | 20–48px | regular | **Bebas Neue** |
| Scoreboard score | 64px | regular | **Bebas Neue** |

### Radii
- Cards: `14px` (`rounded-[14px]`)
- Buttons: `12px`
- Pills / badges: `6–8px`
- Avatar: 32% of size

### Spacing rhythm
- Card padding: `14px 16px` typical, `18px` for hero cards
- Card gap (vertical): `8px` between rows, `14–18px` between sections
- Page horizontal padding: `16px`

### Icon library
Use **Lucide React** (`lucide-react`). The prototype uses Feather-style icons; Lucide is a drop-in match.
- Mapping: `Home`, `Trophy`, `Users`, `Plus`, `Settings` (gear), `BarChart3` (chart), `Star`, `Bell`, `ChevronRight`, `ChevronLeft` (back), `ChevronDown`, `ArrowUp`, `Edit`, `Sun`, `Moon`, `Flame`, `Calendar`, `Clock`, `MapPin`, `Share2`, `Zap` (lightning), `Undo2`, `Check`, `X`.

---

## Screens

### 1. Home Dashboard
**Purpose:** Entry point. Surface the user's league, give one-tap access to live games, free play, and recent activity.

**Layout (top to bottom):**
1. **Header row** (padding `14px 0 18px`)
   - Left: avatar (40px) + 2-line stack: "Welcome back" (12px dim) over "Santi" (18px 700 text).
   - Right: bell icon button + gear icon button (38×38, `rounded-[12px]`, alt bg). Bell shows red `err` badge "3" when unread.
2. **League hero card** — gradient `surface→alt`, `1px` accent-40% border, `rounded-[14px]`, padding `18px`.
   - Top: small accent label "MY LEAGUE" + title "Miami Beach League" in **Bebas Neue 30px** + sub "Season 2026 · 24 players" (12px dim). Right: rank tile (`accent/15` bg) — "RANK" (9px 700) over "#3" (Bebas 26px).
   - Bottom: 3 stat tiles in a flex row, each `flex: 1`, `bg-bg`, `rounded-[10px]`, padding `10px 4px`, centered. Tile: Bebas 20px number over 9px dim label. Stats: **Tourneys 3** · **Matches 12** · **Record 8W-4L**.
3. **Free Play CTA card** — `linear-gradient(135deg, free/15, surface)`, `1px` free/30% border, `rounded-[14px]`, padding `16px`. Layout: 52px rounded-square teal-tinted icon (Lucide `Zap`) + 2-line text ("Free Play" / "Quick match · Any players · No league") + plus icon on right.
4. **"RECENT" label** + "See all" link (right-aligned, accent, 11px 600).
5. **3 Activity rows** — each is a card with: 38×38 rounded icon tile + 2-line title/sub + status badge on right. Kinds:
   - tournament (trophy icon, accent) — "Spring Cup" / "Final round · tonight 8pm" / **LIVE** badge (ok green)
   - freeplay (volleyball icon, teal) — "Free Play" / "Yesterday · 4 players" / Done badge (dim)
   - trophy (trophy, accent) — "Winter Clash" / "Mar 8 · 1st place" / Won badge (accent)
6. **Bottom nav** — `1px` top border, surface bg, padding `6px 0 10px`, 2 items: Home (active, accent) | Profile.

**No "Live now" section on Home** — it lives inside Tournament and League screens.

### 2. League Detail
**Tabs (bottom nav style):** Rankings · Players · Tournaments · Settings (gear).
- **Rankings:** big "Your position" card with Bebas #3, ELO sub, ↑ trend, sparkline SVG. Then ranked list (top 8) — row: rank #, avatar, name (current user highlighted in accent-soft bg with "YOU" tag), W-L sub, ELO right.
- **Players (Admin view):** see section 2a below.
- **Tournaments:** "+ New" link top-right. List of tournament cards with status pill (In Progress / Upcoming / Completed).
- **Settings:** key/value rows (League name, Season, Location, Points system, Visibility) + Danger zone (Leave league).

### 2a. League → Players

This tab has **two views** depending on the viewer's role in the league:

- **Member view** (read-only) — default for regular league members
- **Admin view** — for league admins; adds management affordances on top of the member view

#### Member view (read-only roster)

- Search field showing `Search {N} players…` (no plus button)
- **No** linked/guest legend
- **No** "TAP TO MANAGE" hint
- List rows show: avatar, name, `ELO {elo}` (no level, no link-status dot, no chevron)
- Rows are **not interactive** — no tap target, no detail sheet, no actions

#### Admin view

Adds, on top of the member view:
- Plus button next to search (invite/add player)
- Linked/guest legend strip with the "TAP TO MANAGE" hint
- Link-status dot on each avatar (green solid = linked, hollow = guest)
- Level shown in the meta line: `ELO {elo} · {level}`
- Right chevron on each row
- Whole row is tap-to-open → opens the player detail sheet

The prototype exposes a **Role** tweak (Admin / Member) in the Tweaks panel to switch between the two views.

#### Player data shape

Extend the player record with:
```js
{
  id, name, short, initials, elo, hue,    // existing
  nickname: string,                        // optional, displayed in detail sheet
  gender:   'F' | 'M' | 'X',               // F=Female, M=Male, X=Other
  level:    'Beginner' | 'Intermediate' | 'Advanced',
  linked:   boolean,                       // true if attached to a real user account
  email:    string | null,                 // populated only when linked
}
```

#### Admin-only UI

The remaining sections describe the surfaces that only appear in the admin view.

**List row** (visual unchanged from base spec):
- Avatar with **link-status dot** overlay at bottom-right (11px circle, 2px surface border):
  - **Linked** → solid `ok` green fill, with an `ok` 1px outline ring
  - **Guest** → hollow (surface fill, `dim` 1px outline ring)
- Name (13px 600) + meta line `ELO {elo} · {level}` (10px dim)
- Right chevron
- Whole row is tap-to-open; uses `.tap` feedback

**Above the list:** small legend strip (10px dim type) showing `{N} linked · {N} guest` with matching dot swatches, and right-aligned "TAP TO MANAGE" hint (uppercase 10px 600).

**Player detail sheet** (bottom sheet, opens on row tap):
- Header strip: 56px avatar with 16px link-status dot, name (17px 700), and meta line
  - Linked → check icon + "Linked" (ok green) + " · {email}"
  - Guest  → "Guest player · no account" (dim)
- Close button top-right (32px circle, alt bg, X icon)
- **Detail rows** (key/value list, 12px 14px padding, label flex-basis 96px uppercase 11px 600 dim, value right-aligned 13px text):
  - Full name
  - Nickname (or `—`)
  - Gender (rendered as Female / Male / Other)
  - Level (rendered as accent-soft pill, 12px 700, accent text)
  - ELO (Bebas Neue 16px)
- **Action row:**
  - Primary `Btn` "Edit details" with edit icon (full-width when no Unlink, half-width otherwise)
  - Ghost `Btn` "Unlink" with X icon — **only when `linked === true`**
- **Destructive button** (full-width below): transparent bg, `err`-40% border, `err` text, 13px 700 — "Remove from league"

**Edit mode** (toggled by Edit details):
- Same sheet, replaces detail rows with a form card:
  - Full name — text input
  - Nickname — text input, placeholder "Optional"
  - Gender — 3-up segmented buttons (Female / Male / Other), selected: accent border + accentSoft bg + accent text
  - Level — 3-up segmented buttons (Beginner / Intermediate / Advanced), selected: filled accent bg + white text
- Action row: Cancel (ghost) | Save (primary, check icon)
- Inputs: 10px 12px padding, 8px radius, line border, bg fill, 13px

**Confirmation sheet** (replaces detail sheet for destructive actions):
- 48px circle icon at top-center, `err`-12% bg, `err` X icon
- Title (17px 700 centered): "Remove player?" or "Unlink account?"
- Body copy (12px dim centered, 1.5 line-height):
  - Remove: *"This removes **{name}** from the league. Match history is preserved."*
  - Unlink: *"The user account stays, but **{name}** becomes a guest profile you control."*
- Action row: Cancel (ghost) | Confirm button — solid `err` bg, white text, 13px 700, label "Remove" / "Unlink"
- On confirm: dismiss sheet + show Toast ("Player removed" / "Account unlinked", 1.8s)

**State management notes:**
- The list maintains its own `players` state seeded from the API; mutations are optimistic.
- `Remove` filters the player out of the list (preserving match history server-side).
- `Unlink` flips `linked → false` and clears `email`; the player record stays.
- `Save` (edit) PATCHes `{name, nickname, gender, level}`.

### 3. Tournament Detail
**Tabs (segmented underline):** Standings · Matches · Players.
- **Live match card** at top (gradient, ok-green border): pulse dot + "LIVE · SET 2" + sub. Two big Bebas scores side-by-side with VS divider, sets line under.
- **Standings table:** header row (alt bg, uppercase 10px). Body rows: Bebas rank, team name + 2 player initials, W (ok), L (err), PTS.
- **Matches:** card per match with status (LIVE/FINAL/UPCOMING), court + time, two team rows with Bebas scores.
- **Players:** team cards — team name + W-L, two player chips (avatar 26px + short name in alt-bg pill).

### 4. Tournament Setup Wizard
4-step wizard with progress bar (4px alt track, accent fill).
1. **Name + date + format.**
2. **Players** (8 selected of 10). Selectable cards with checkbox.
3. **Team building.**
4. **Review.**
Footer: Continue / Launch button (full-width, ok-green on final step).

### 5. Live Match Flow
Three phases:
1. **Setup** — match info card, two team-order cards (player ordered list 1/2), first-serve toggle (Alpha vs Bravo), sets-per-match toggle (1 set / Best of 3 / Best of 5). Footer: "🏐 Start Match" (ok-green).
2. **Scoreboard** — pulse "LIVE" badge in header, "Set 2 · to 21 · Serving Alpha" pill. **Broadcast scoreboard:** dark `scoreBg` panel with subtle 45° line pattern overlay (8% accent), two big team panels divided by faint vertical line. Each side: team name (11px 700 #E8ECF1), players (9px), Bebas **64px** score (accent if serving with 24px shadow glow), "Sets: N" sub, and if serving — small badge with "🏐 SERVING" + server name.
   - Two action buttons: **+1 Alpha** (accent), **+1 Bravo** (teal).
   - Secondary row: Undo (surface variant, undo icon) + End Match (err, small).
   - History card list with score in Bebas 16px accent, event description, server name (with 🏐 emoji), team-color badge.
3. **Result** — pop-in animated trophy card (`linear-gradient` accent-soft → surface, accent border). 🏆 emoji, "WINNER · Team Alpha" Bebas 30px, big 2 vs 1 sets count, "21-18 · 19-21 · 21-17" set scores. Then "POINTS BY TYPE" stacked bars (Spikes/Aces/Blocks/Tips/Errors with A vs B counts), "TOP PERFORMERS" rows (avatar + name + stat + flame icon). Footer: Share + Done.

**Point-entry sheet flow:**
- Tap +1 → bottom sheet with team header pill, then 4 grid cards (Ace 🎯 / Spike 💥 / Block 🛡️ / Tip 🤏) + full-width Rival error ❌ (err-soft bg).
- Pick non-error → second sheet "Who scored?" with 2 big avatar cards (44px avatars).

### 6. Profile
Hero card: 76px avatar centered, name (Bebas 24px), handle/league sub, three stats row (ELO accent / Rank / Win rate ok-green) — all Bebas 22px.
"Signature shots" card with 3 stat bars (Spikes accent / Blocks teal / Aces ok-green) — label + Bebas value + filled progress bar.
"Achievements" 3-col grid of emoji + label tiles.

### 7. Free Play
Teal-tinted info card explaining "Stats won't affect your league ELO."
Player grid (2 cols, 4 players, team A/B labels). Add player button.
Rules list (Scoring / Sets / Timeout). Footer: "🏐 Start Free Play" (teal).

### 8. Notifications
List of cards. Unread cards have tinted bg (color-soft, color-20% border). Each: 36px rounded emoji tile + title (13px 700) + sub (11px dim) + time/dot stack on right. Kinds: match (ok), rank (accent), invite (teal), result (accent), achievement (accent).

### 9. Settings
Sectioned key/value list (Account / Play / App). Each row: emoji icon + label + value + chevron.
Sign-out card (err text, centered).
Version footer.

---

## Components Inventory

Build these once in `src/components/ui/` and reuse:

| Component | Props | Purpose |
|---|---|---|
| `Card` | `gradient?`, `border?`, `onClick?` | rounded-14, surface bg, optional gradient and onClick tap-feedback |
| `Btn` | `variant: primary\|soft\|ghost\|surface`, `color?`, `icon?`, `small?` | primary buttons, full-width by default |
| `IconBtn` | `badge?`, `size?` | square 38px icon button, optional red badge |
| `Avatar` | `player`, `size`, `ring?` | uses `oklch(0.55 0.15 hue)` color from player.hue, shows initials |
| `Badge` | `color?`, `solid?` | tiny pill, color-soft bg or solid |
| `Label` | `color?` | UPPERCASE 11px 700 letter-spaced section heading |
| `PlayerChip` | `player`, `color?`, `small?` | dot + short name pill |
| `PageHeader` | `title`, `sub?`, `onBack?`, `rightSlot?`, `badge?`, `badgeColor?` | top header with back + title + optional live badge |
| `BottomNav` | `items`, `active`, `onChange` | tab bar |
| `Sheet` | `open`, `onClose` | bottom sheet with slide-up animation, drag handle, scrim |
| `PlayerDetailSheet` | `player`, `onClose`, `onSave`, `onUnlink`, `onRemove` | admin player detail/edit sheet (League → Players); toggles between view and edit modes |
| `ConfirmSheet` | `confirm: {kind:'remove'\|'unlink', player}`, `onCancel`, `onConfirm` | destructive confirmation sheet with err-tinted icon, contextual copy, and red confirm button |
| `DetailRow` | `label`, `value`, `last?` | label/value row used inside detail sheets — uppercase 11px label (96px basis), right-aligned value |
| `Field` | `label` | form field wrapper with uppercase 10px label above the control |
| `Toast` | `message` | floating pill at bottom |

## Animations

- `.route-enter` — fadeIn + 6px slide-up, 220ms ease-out
- `.sheet-enter` — slide up from 100%, 280ms `cubic-bezier(.2,.8,.2,1)`
- `.overlay-enter` — fade in 200ms
- `.pop-enter` — scale .85→1 + fade, 250ms `cubic-bezier(.2,.9,.3,1.1)`
- `.dot-pulse` — 1.6s pulse on live dot (box-shadow ring expand + opacity 1→0.6)
- `.tap` — `transition: transform 120ms`, `:active { scale(.97); opacity: .85 }`

## State Management
The prototype uses an in-memory router with a stack: `push`, `pop`, `replace`. In your real app:
- Use **React Router** (you likely already do) with these routes: `/`, `/league`, `/league/players`, `/tournament/:id`, `/tournament/new`, `/match/:id/setup`, `/match/:id/live`, `/match/:id/result`, `/profile`, `/free-play`, `/notifications`, `/settings`.
- Live match state (score/log/sets/serving) stays in component state during a match, persists to backend on point/match save.

## Files in this bundle
- `Arenix Prototype.html` — the full prototype (entry point)
- `src/data.jsx` — mock data shape — **use as your API contract reference**
- `src/icons.jsx` — SVG icon set (mapping to Lucide above)
- `src/shared.jsx` — primitives (Card, Btn, etc.)
- `src/home.jsx` — Home (3 variants: hero, split, feed). Use **hero** for the real app.
- `src/league.jsx` — League detail
- `src/tournament.jsx` — Tournament detail + setup wizard
- `src/match.jsx` — Live match flow
- `src/other.jsx` — Profile, Free Play, Notifications, Settings
- `src/app.jsx` — root with Theme + Router providers + Tweaks panel

## Implementation Order (recommended)
1. Add design tokens to `tailwind.config.js`. Import fonts.
2. Build the primitives (`Card`, `Btn`, `Avatar`, `Badge`, `Label`, `PageHeader`, `BottomNav`).
3. Port Home (hero variant). Verify visual match before moving on.
4. League → Tournament → Live match → Result.
5. Profile, Notifications, Settings, Free Play.
6. Tournament setup wizard last (most state-heavy).

## Tips for Claude Code
- Open one screen at a time. Pass: a screenshot + the corresponding `src/*.jsx` from this bundle + the target file path in your repo.
- Prompt template: *"Match this design exactly using Tailwind. Same hex colors, same px sizes, same font weights, same icons (Lucide). Reuse existing primitives in `src/components/`. Don't invent new content — use only what's shown."*
- After each screen, eyeball-diff with the prototype. Iterate on specific spots, not the whole file.
