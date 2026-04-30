/**
 * LeaguePublicView — resolves an invite code to a league id,
 * then redirects to /league/:id for the full read-only view.
 *
 * Route: /league/view/:code  (public — no ProtectedRoute)
 *
 * Behaviour:
 *  - Public league  → redirect to /league/:id (LeagueDetail handles guest mode)
 *  - Private league → redirect to /login?next=/league/view/:code
 *  - Not found      → friendly error screen
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getLeagueIdByInviteCode } from '../services/inviteService'
import { useAuth } from '../contexts/AuthContext'

export default function LeaguePublicView() {
  const { code }    = useParams()
  const navigate    = useNavigate()
  const location    = useLocation()
  const { session, loading: authLoading } = useAuth()

  // If there's no code at all, show error immediately (no effect needed)
  const [error, setError] = useState(() => code ? null : 'No invite code provided.')

  useEffect(() => {
    if (error) return            // already in error state — nothing to do
    if (authLoading) return      // wait for auth to settle before deciding

    let cancelled = false

    async function resolve() {
      const result = await getLeagueIdByInviteCode(code)

      if (cancelled) return

      if (!result) {
        setError('This link is invalid or the league no longer exists.')
        return
      }

      const { id, visibility } = result

      if (visibility !== 'public' && !session) {
        // Private league — guest must log in first; after login land back here
        navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true })
        return
      }

      // Public league (or user is authenticated) → go straight to league detail
      navigate(`/league/${id}`, { replace: true })
    }

    resolve()
    return () => { cancelled = true }
  }, [code, authLoading, session, navigate, location.pathname, error])

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-text gap-4 px-6 text-center">
        <div className="text-[40px]">🔗</div>
        <div className="text-[17px] font-bold">Link not found</div>
        <div className="text-[13px] text-dim max-w-[280px]">{error}</div>
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-[13px] border-0 cursor-pointer"
        >
          Go to home
        </button>
      </div>
    )
  }

  // Loading / resolving
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
