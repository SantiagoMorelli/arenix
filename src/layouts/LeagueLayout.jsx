/**
 * LeagueLayout — shell for screens nested under /league/:id.
 *
 * Currently LeagueDetail.jsx carries its own 4-tab BottomNav so this layout
 * is a thin Outlet wrapper.  Once league data is wired the nav and any shared
 * league header can be lifted here.
 *
 * It also records the league as the user's "last visited" one (read by
 * useStartupRedirect) — here rather than in LeagueDetail so tournament
 * deep links count too.
 */
import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { rememberLastLeague } from '../lib/lastLeague'

export default function LeagueLayout() {
  const { id } = useParams()
  const { session } = useAuth()

  useEffect(() => {
    if (session?.user?.id && id) rememberLastLeague(session.user.id, id)
  }, [session, id])

  return (
    <div className="bg-bg min-h-screen text-text">
      <Outlet />
    </div>
  )
}
