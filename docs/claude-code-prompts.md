# Beach Volleyball App — Claude Code Migration Guide

## How This Works

Claude Code can read files in your project. Instead of describing the design
in words (which is imprecise), you give it the **wireframe file as the source
of truth** and tell it to match it exactly.

-----

## Setup (do this first)

1. Copy `tailwind-guide.jsx` into your project:
   
   ```
   mkdir -p docs
   cp tailwind-guide.jsx docs/design-reference.jsx
   ```
1. Also copy the dark mode wireframe for reference:
   
   ```
   cp app-wireframe-dark.jsx docs/design-dark.jsx
   cp app-wireframe-light.jsx docs/design-light.jsx
   ```
1. Open Claude Code from your project root:
   
   ```
   claude
   ```

-----

## Prompt 1 — Install Tailwind CSS

```
Install Tailwind CSS v4 in this Vite + React project.

Look at docs/design-reference.jsx — extract every color used in the THEMES
object and configure them as custom colors in tailwind.config.js.

The dark theme colors should be the defaults (dark mode first since
that's the primary theme). Light mode colors go under a "light" variant
or use Tailwind's dark: class strategy.

Also add DM Sans from Google Fonts as the default font.

Create a global.css with the Tailwind directives.

Don't modify any existing components yet.
```

-----

## Prompt 2 — Restructure Navigation

```
Look at docs/design-reference.jsx to understand the navigation hierarchy:

- Home screen: entry point, shows league cards + Free Play button.
  Bottom nav has 2 tabs: Home and Profile.

- League screen (/league/:id): has its OWN bottom nav with 4 tabs:
  Rankings, Players, Tournaments, Settings.

- Tournament screen (/league/:id/tournament/:tid): NO bottom nav.
  Has a back arrow that returns to the league. Pushed on top.

- Free Play (/free-play): NO bottom nav.
  Has a back arrow that returns to home. Separate flow.

Restructure our React Router to match this. Create a BottomNav
component that renders different tabs depending on the current route.

IMPORTANT: Keep all existing Supabase queries, auth logic, hooks,
context providers, and business logic exactly as they are.
Only change routing and layout wrappers.
```

-----

## Prompt 3 — Create Shared UI Components

```
Look at docs/design-reference.jsx and extract the repeating UI patterns
into reusable components in src/components/ui/:

1. Card — the rounded container used for league card, free play card,
   team cards. Match the exact border-radius, padding, border colors,
   and gradient backgrounds from the reference file.

2. Badge — the small colored pill (like "LIVE", "Done", "#3 Rank").
   Match the exact font size, padding, border-radius, and color variants.

3. BottomNav — the tab bar at the bottom. Match exact height, spacing,
   icon size, active/inactive colors.

4. ListItem — the row used in recent activity and rankings. Match the
   icon container size, text sizes, gap spacing.

5. SectionHeader — the uppercase label like "RECENT", "TOP RANKINGS".
   Match letter-spacing, font-weight, color.

6. ScoreBoard — the match score display with two teams. Match the large
   number font-size, the SET badge, the gradient background.

7. PlayerChip — small rounded name tag. Match the two color variants
   (accent orange and teal) from the reference.

8. StatBox — the small stat cards (Tournaments: 3, Matches: 12).
   Match the exact sizing and layout.

Use Tailwind CSS classes. All sizing should be mobile-first with
touch-friendly tap targets (min h-11 / 44px).

Do NOT touch any Supabase code, hooks, or business logic.
```

-----

## Prompt 4 — Restyle Home Screen

```
Look at the Home screen in docs/design-reference.jsx (the HomeScreen
component). Now restyle our actual Home screen to match it EXACTLY:

- Same colors, spacing, border-radius, font sizes
- Same layout structure (header, league card, free play card, recent list)
- Same bottom nav with Home and Profile tabs
- Use the shared UI components we just created
- Use Tailwind CSS classes

Match the visual output pixel-for-pixel with the reference.

CRITICAL: Do NOT modify any useState, useEffect, Supabase queries,
auth checks, data fetching, or business logic. Only change the JSX
structure and className styling. Keep all hooks and data flow intact.
```

-----

## Prompt 5 — Restyle League Screen

```
Look at the League screen in docs/design-reference.jsx (the LeagueScreen
component). Restyle our League screen to match it exactly.

- Rankings list with numbered rows, highlight for current user
- Tournament cards with status badges
- Contextual bottom nav: Rankings, Players, Tournaments, Settings
- Back arrow in header

Use the shared UI components. Match colors and spacing from reference.

Do NOT modify any Supabase queries or business logic.
```

-----

## Prompt 6 — Restyle Tournament Screen

```
Look at the Tournament screen in docs/design-reference.jsx. Restyle our
Tournament screen to match:

- Team cards with player chips and W-L record
- Live match scoreboard with large score numbers
- "Open Match Controls" CTA button
- NO bottom nav, back arrow header
- LIVE badge in header

Use shared components. Match the reference exactly.

Do NOT modify any Supabase queries or business logic.
```

-----

## Prompt 7 — Restyle Free Play Screen

```
Look at the Free Play screen in docs/design-reference.jsx. Restyle our
Free Play screen to match:

- Uses TEAL color scheme (not orange accent)
- Player chips with "+ Add" dashed button
- Team cards
- "Start Match" teal CTA button
- Session Rankings list
- NO bottom nav, back arrow header

Use shared components. Match the reference exactly.

Do NOT modify any Supabase queries or business logic.
```

-----

## Tips for Best Results

- **Run one prompt at a time.** Let Claude Code finish and verify before moving on.
- **After each prompt, test the app** with `npm run dev` to catch issues early.
- **If something doesn’t match,** tell Claude Code: “Compare the output with
  docs/design-reference.jsx — the [specific thing] doesn’t match. Fix it.”
- **The golden rule in every prompt:** “Do NOT modify Supabase code, hooks,
  or business logic.” Say it every time.