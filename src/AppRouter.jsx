/**
 * AppRouter — top-level route declarations.
 *
 * All new pages live here.  The legacy state-based app is preserved at /legacy
 * so existing functionality remains fully accessible during the migration.
 *
 * Target hierarchy (from CLAUDE.md):
 *
 *   /                              → Home
 *   /profile                       → Profile
 *   /settings                      → Settings
 *   /free-play                     → Free Play  (placeholder → full page later)
 *   /league/:id                    → LeagueDetail
 *   /league/:id/tournament/:tid    → Tournament  (placeholder)
 *   /league/:id/tournament/:tid/match/:mid → Live Match (placeholder)
 *   /legacy                        → Original App (full state-based app)
 */
import { Routes, Route } from 'react-router-dom'

import MainLayout   from './layouts/MainLayout'
import LeagueLayout from './layouts/LeagueLayout'

import Home         from './pages/Home'
import Profile      from './pages/Profile'
import Settings     from './pages/Settings'
import LeagueDetail from './pages/LeagueDetail'

import LegacyApp    from './App'

// ─── Simple placeholder for routes not yet built ──────────────────────────────
function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2">
      <div className="text-[18px] font-bold">{title}</div>
      <div className="text-[13px] text-dim">Coming soon</div>
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────
export default function AppRouter() {
  return (
    <Routes>

      {/* ── Screens with Home / Profile bottom nav ── */}
      <Route element={<MainLayout />}>
        <Route path="/"        element={<Home />}    />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* ── Pushed screens (no bottom nav) ── */}
      <Route path="/settings"  element={<Settings />} />
      <Route path="/free-play" element={<Placeholder title="Free Play" />} />

      {/* ── League hierarchy ── */}
      <Route path="/league/:id" element={<LeagueLayout />}>
        <Route index element={<LeagueDetail />} />
        <Route
          path="tournament/:tid"
          element={<Placeholder title="Tournament" />}
        />
        <Route
          path="tournament/:tid/match/:mid"
          element={<Placeholder title="Live Match" />}
        />
      </Route>

      {/* ── Legacy state-based app (all original functionality preserved) ── */}
      <Route path="/legacy/*" element={<LegacyApp />} />

    </Routes>
  )
}
