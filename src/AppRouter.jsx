/**
 * AppRouter — top-level route declarations.
 *
 * Public routes:  /login, /signup, /free-play/join/:code,
 *                 / (Home branches to GuestHome when not logged in),
 *                 /league/:id (read-only for guests; private leagues redirect to /login),
 *                 /league/:id/tournament/:tid (read-only for guests)
 * Protected routes: everything else (wrapped in <ProtectedRoute>)
 *
 * Target hierarchy:
 *
 *   /                              → Home (auth) | GuestHome (guest)
 *   /profile                       → Profile
 *   /settings                      → Settings
 *   /free-play                     → Free Play
 *   /free-play/join/:code          → FreePlayJoin (public — invite link)
 *   /league/:id                    → LeagueDetail (public for public leagues)
 *   /league/:id/tournament/new     → TournamentSetupWizard
 *   /league/:id/tournament/:tid    → TournamentDetail (public for public leagues)
 *   /league/:id/tournament/:tid/match/:mid → Live Match (protected)
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
import FreePlayWizard      from './pages/FreePlayWizard'
import FreePlaySession     from './pages/FreePlaySession'
import FreePlayLiveMatch   from './pages/FreePlayLiveMatch'
import FreePlayJoin        from './pages/FreePlayJoin'
import LeaguePublicView    from './pages/LeaguePublicView'

export default function AppRouter() {
  return (
    <Routes>

      {/* ── Public (no auth required) ── */}
      <Route path="/login"  element={<Login />}  />
      <Route path="/signup" element={<Signup />} />

      {/* ── Semi-public: Home (branches to GuestHome when not logged in) ── */}
      <Route element={<MainLayout />}>
        <Route path="/"        element={<Home />}                                     />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>

      {/* ── Protected: pushed screens (no bottom nav) ── */}
      <Route path="/settings"      element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/edit-profile"  element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
      <Route path="/free-play"            element={<ProtectedRoute><FreePlayList /></ProtectedRoute>} />
      <Route path="/free-play/new"        element={<ProtectedRoute><FreePlayWizard /></ProtectedRoute>} />
      <Route path="/free-play/join/:code" element={<FreePlayJoin />} />
      <Route path="/free-play/:id"        element={<ProtectedRoute><FreePlaySession /></ProtectedRoute>} />
      <Route path="/free-play/:id/match"  element={<ProtectedRoute><FreePlayLiveMatch /></ProtectedRoute>} />
      {/* Legacy invite URL — redirect to new code-based join page if no code is known.
          Visitors following old /free-play/:id/join links land here; the FreePlayJoin
          component will handle fetching by id fallback. */}
      <Route path="/free-play/:id/join"   element={<FreePlayJoin />} />

      {/* ── Protected: join league via invite code ── */}
      <Route path="/join/:code" element={<ProtectedRoute><JoinLeague /></ProtectedRoute>} />

      {/* ── Public: read-only league view via invite code ── */}
      <Route path="/league/view/:code" element={<LeaguePublicView />} />

      {/* ── Semi-public: league hierarchy
           /league/:id and /league/:id/tournament/:tid are public for public leagues.
           LeagueDetail/TournamentDetail handle the private-league redirect internally.
           /league/:id/tournament/new and /match/:mid remain protected. ── */}
      <Route path="/league/:id" element={<LeagueLayout />}>
        <Route index element={<LeagueDetail />} />
        <Route path="tournament/new"        element={<ProtectedRoute><TournamentSetupWizard /></ProtectedRoute>} />
        <Route path="tournament/:tid"       element={<TournamentDetail />} />
        <Route path="tournament/:tid/match/:mid" element={<ProtectedRoute><LiveMatch /></ProtectedRoute>} />
      </Route>

    </Routes>
  )
}
