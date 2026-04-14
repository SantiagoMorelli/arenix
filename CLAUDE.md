# Beach Volleyball App — Project Context for Claude Code

## Tech Stack

- **Frontend:** React + Vite (standard web app, NOT React Native)
- **Styling:** Tailwind CSS (being added — see docs/design-reference.jsx)
- **Backend:** Supabase (database, auth, API)
- **Target:** Mobile-first PWA (mostly used on phones via browser)

## Project Structure

- `src/` — React components, pages, hooks, utils
- `public/` — Static assets
- `docs/` — Design reference files and migration guide
- `index.html` — Entry point
- `vite.config.js` — Vite configuration

## Design System

The target design is defined in `docs/design-reference.jsx`. Always reference
this file when making styling decisions. It contains:

- Exact color tokens (dark and light themes)
- Component patterns (Card, Badge, TabBar, ListItem, etc.)
- Screen layouts (Home, League, Tournament, Free Play)
- Navigation hierarchy

### Color Tokens (Dark — primary theme)

- bg: #0F1923
- surface: #1A2734
- surface-alt: #243447
- accent: #F5A623 (orange — league content)
- free: #00BCD4 (teal — free play content)
- success: #2ECC71
- text: #E8ECF1
- dim: #7A8EA0
- line: #2A3A4A

### Color Tokens (Light)

- bg: #F5F6F8
- surface: #FFFFFF
- surface-alt: #EDF0F4
- accent: #E8850C
- free: #0891B2
- success: #16A34A
- text: #1A1D23
- dim: #6B7280
- line: #E2E5EB

### Typography

- Font: DM Sans (from Google Fonts)
- Headings: 700/800 weight
- Body: 400/500 weight

## Navigation Hierarchy

```
/ → Home (bottom nav: Home | Profile)
/league/:id → League (bottom nav: Rankings | Players | Tournaments | Settings)
/league/:id/tournament/:tid → Tournament detail (NO bottom nav, back arrow)
/free-play → Free Play (NO bottom nav, back arrow)
```

## Rules — READ CAREFULLY

### DO NOT modify:

- Any Supabase client setup or queries
- Authentication logic or session handling
- React hooks that fetch or mutate data (useEffect, custom hooks)
- Context providers or state management logic
- Database-related types or interfaces
- Any file in a `services/`, `api/`, `hooks/`, or `lib/supabase` directory
  (unless ONLY changing imports due to file moves)

### DO modify:

- Component JSX and className styling
- Navigation/routing structure
- Layout wrappers and page shells
- Tailwind configuration and global CSS
- Shared UI components (create new ones in src/components/ui/)

### General guidelines:

- Mobile-first: design for 320-428px width, scale up
- Touch targets: minimum 44px height for interactive elements
- Use Tailwind CSS utility classes, not inline styles or CSS modules
- Support dark mode with Tailwind’s dark: prefix
- Keep all components in single files unless they exceed 200 lines

## Migration Guide

See `docs/claude-code-prompts.md` for the step-by-step migration plan.
Run prompts in order (1 through 7). Test after each step.