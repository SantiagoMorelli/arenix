# AGENTS.md

## Quick Reality Check (trust code over docs)
- `README.md` is still Vite template text and not authoritative for this app.
- `CLAUDE.md` has key constraints, but some architecture notes are stale (it says no React Router; router is now active).


## Verified Commands
- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build (works): `npm run build`
- Lint all files: `npm run lint` (currently noisy/failing due repo-wide issues, including wireframe files)
- Lint only touched app files: `npx eslint <file1> <file2> ...` (preferred for focused work)

## App Entry + Routing
- Entry point: `src/main.jsx`
  - Imports `./lib/migration` **before** rendering.
  - Wraps app in `BrowserRouter`.
- Top-level routes: `src/AppRouter.jsx`
  - New routed UI: `/`, `/profile`, `/settings`, `/league/:id`, `/league/:id/tournament/:tid`
  - Legacy full app preserved at `/legacy` (`src/App.jsx`)
  - `/free-play` and `/league/:id/tournament/:tid/match/:mid` are still placeholders.


## Styling System (current reality)
- Tailwind v4 via `@tailwindcss/vite` in `vite.config.js`.
- Theme tokens are defined in `src/index.css` (`--c-*` + `@theme`), not in `tailwind.config.js`.
- Dark mode is class-based (`html.dark`) via custom variant in `src/index.css`.
- Reusable migrated primitives live in `src/components/ui-new.jsx` (no `src/components/ui.jsx` currently).


## Practical Workflow for Safe Changes
- Prefer implementing new UI/routes in routed pages/components first.
- After edits: run `npm run build` + targeted `npx eslint` on changed files.
