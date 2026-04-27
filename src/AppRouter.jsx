/**
 * AppRouter — top-level route declarations.
 *
 * Public routes:  /login, /signup
 * Protected routes: everything else (wrapped in <ProtectedRoute>)
 *
 * Target hierarchy (from CLAUDE.md):
 *
 *   /                              → Home
 *   /profile                       → Profile
 *   /settings                      → Settings
 *   /free-play                     → Free Play
 *   /league/:id                    → LeagueDetail
 *   /league/:id/tournament/new     → TournamentSetupWizard
 *   /league/:id/tournament/:tid    → TournamentDetail
 *   /league/:id/tournament/:tid/match/:mid → Live Match
 *   /join/:code                    → JoinLeague
 */
import { Routes, Route } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import MainLayout     from './layouts/MainLayout'
import LeagueLayout   from './layouts/LeagueLayout'

import Login               from './pages/Login'
import Signup              from './pages/Signup'
import Home                from './pages/Home'
import Profile             from './pages/Profile'
import Settings            from './pages/Settings'
import EditProfile         from './pages/EditProfile'
import LeagueDetail        from './pages/LeagueDetail'
import TournamentDetail    from './pages/TournamentDetail'
import TournamentSetupWizard from './pages/TournamentSetupWizard'
import LiveMatch           from './pages/LiveMatch'
import JoinLeague          from './pages/JoinLeague'
import FreePlayList        from './pages/FreePlayList'
import FreePlaySession     from './pages/FreePlaySession'
import FreePlayLiveMatch   from './pages/FreePlayLiveMatch'
import FreePlayJoin        from './pages/FreePlayJoin'

export default function AppRouter() {
  return (
    <Routes>

      {/* ── Public (no auth required) ── */}
      <Route path="/login"  element={<Login />}  />
      <Route path="/signup" element={<Signup />} />

      {/* ── Protected: screens with Home / Profile bottom nav ── */}
      <Route element={<MainLayout />}>
        <Route path="/"        element={<ProtectedRoute><Home /></ProtectedRoute>}    />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>

      {/* ── Protected: pushed screens (no bottom nav) ── */}
      <Route path="/settings"      element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/edit-profile"  element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
      <Route path="/free-play"            element={<ProtectedRoute><FreePlayList /></ProtectedRoute>} />
      <Route path="/free-play/:id"        element={<ProtectedRoute><FreePlaySession /></ProtectedRoute>} />
      <Route path="/free-play/:id/match"  element={<ProtectedRoute><FreePlayLiveMatch /></ProtectedRoute>} />
      <Route path="/free-play/:id/join"   element={<FreePlayJoin />} />

      {/* ── Protected: join league via invite code ── */}
      <Route path="/join/:code" element={<ProtectedRoute><JoinLeague /></ProtectedRoute>} />

      {/* ── Protected: league hierarchy ── */}
      <Route path="/league/:id" element={<ProtectedRoute><LeagueLayout /></ProtectedRoute>}>
        <Route index element={<LeagueDetail />} />
        <Route path="tournament/new"        element={<TournamentSetupWizard />} />
        <Route path="tournament/:tid"       element={<TournamentDetail />} />
        <Route path="tournament/:tid/match/:mid" element={<LiveMatch />} />
      </Route>

    </Routes>
  )
}
