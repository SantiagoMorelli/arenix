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
import { lazy, Suspense, Component } from 'react'
import { Routes, Route } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import MainLayout     from './layouts/MainLayout'
import LeagueLayout   from './layouts/LeagueLayout'

// Kept eager: small, always needed on first paint (auth path)
import Login  from './pages/Login'
import Signup from './pages/Signup'

// All other pages are lazy-loaded — each gets its own chunk
const Home                 = lazy(() => import('./pages/Home'))
const Profile              = lazy(() => import('./pages/Profile'))
const Settings             = lazy(() => import('./pages/Settings'))
const EditProfile          = lazy(() => import('./pages/EditProfile'))
const LeagueDetail         = lazy(() => import('./pages/LeagueDetail'))
const TournamentDetail     = lazy(() => import('./pages/TournamentDetail'))
const TournamentSetupWizard = lazy(() => import('./pages/TournamentSetupWizard'))
const LiveMatch            = lazy(() => import('./pages/LiveMatch'))
const JoinLeague           = lazy(() => import('./pages/JoinLeague'))
const FreePlayList         = lazy(() => import('./pages/FreePlayList'))
const FreePlayWizard       = lazy(() => import('./pages/FreePlayWizard'))
const FreePlaySession      = lazy(() => import('./pages/FreePlaySession'))
const FreePlayLiveMatch    = lazy(() => import('./pages/FreePlayLiveMatch'))
const FreePlayJoin         = lazy(() => import('./pages/FreePlayJoin'))
const LeaguePublicView     = lazy(() => import('./pages/LeaguePublicView'))

// ── Suspense fallback ──────────────────────────────────────────────────────────
function RouteFallback() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-line border-t-accent animate-spin"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

// ── Error boundary for failed chunk downloads (flaky 4G) ──────────────────────
class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ChunkErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
          <div className="bg-surface border border-line rounded-2xl p-6 max-w-[320px] w-full text-center">
            <div className="text-[16px] font-bold text-text mb-2">Couldn't load this page</div>
            <div className="text-[12px] text-dim mb-5 leading-relaxed">
              Check your connection and try again.
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-[10px] text-error bg-error/10 border border-error/20 rounded-xl p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack || ''}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-accent text-white font-bold rounded-xl border-0 text-[14px]"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function AppRouter() {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </ChunkErrorBoundary>
  )
}
