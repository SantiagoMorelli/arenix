import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { useAuth } from '../contexts/AuthContext'
import { addPlayer, updatePlayer, deletePlayer } from '../services/playerService'
import { BottomNav } from '../components/ui-new'
import LeaguePlayersTab from '../components/LeaguePlayersTab'
import RankingsTab from '../components/league/RankingsTab'
import TournamentsTab from '../components/league/TournamentsTab'
import SettingsTab from '../components/league/SettingsTab'
import LeagueHeaderMenu from '../components/league/LeagueHeaderMenu'
import { createNotification } from '../services/notificationService'
import { clearLastLeague } from '../lib/lastLeague'
import { useToast } from '../contexts/ToastContext'
import { ChevronLeft, Home, Users, Trophy, Settings } from 'lucide-react'

// Tabs visible to guests and non-admin members; admins also get Players + Settings
const BASE_NAV_ITEMS = [
  { id: 'home',        icon: <Home size={20} />,   label: 'Home'        },
  { id: 'tournaments', icon: <Trophy size={20} />, label: 'Tournaments' },
]

const ADMIN_NAV_ITEMS = [
  { id: 'home',        icon: <Home size={20} />,     label: 'Home'        },
  { id: 'players',     icon: <Users size={20} />,    label: 'Players'     },
  { id: 'tournaments', icon: <Trophy size={20} />,   label: 'Tournaments' },
  { id: 'settings',    icon: <Settings size={20} />, label: 'Settings'    },
]

// ─── LeagueDetail page ────────────────────────────────────────────────────────
export default function LeagueDetail() {
  const navigate             = useNavigate()
  const { id }               = useParams()
  const location             = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'home')
  const { showError }        = useToast()

  const { league, loading, error, refetch } = useLeague(id)
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useLeagueRole(id)
  const { session, profile }                 = useAuth()

  const isGuest = !session

  // Redirect guests who land on a private league to login with ?next=
  useEffect(() => {
    if (!loading && !error && league && isGuest && league.visibility !== 'public') {
      navigate(`/login?next=/league/${id}`, { replace: true })
    }
  }, [loading, error, league, isGuest, id, navigate])

  // Self-healing: if the league is gone (deleted / access lost), forget it as
  // "last visited" so the startup redirect falls through to its fallbacks.
  useEffect(() => {
    if (!loading && (error || !league) && session?.user?.id) {
      clearLastLeague(session.user.id, id)
    }
  }, [loading, error, league, session, id])

  // Settings and Players tabs are admin-only — non-admins (e.g. arriving via
  // location.state or a notification deep link) fall back to home.
  const effectiveTab =
    ['settings', 'players'].includes(activeTab) && (roleLoading || !isAdmin || isGuest)
      ? 'home'
      : activeTab

  // ── Player mutations ──────────────────────────────────────────────────────
  async function handleAddPlayer(data) {
    try {
      await addPlayer(id, data)
      refetch()
    } catch (err) {
      showError(err, 'Failed to add player.')
    }
  }

  async function handleUpdatePlayer(playerId, updates) {
    const leagueName = league?.name || 'a league'
    const leagueId   = league?.id
    // Capture current userId before the update (needed for unlink notification)
    const currentUserId = (league?.players || []).find(p => p.id === playerId)?.userId ?? null

    try {
      await updatePlayer(playerId, updates)

      if (updates.userId) {
        await createNotification(
          updates.userId,
          'profile_linked',
          'You were added to a league 🤝',
          `Your profile was linked in ${leagueName}`,
          { leagueId },
        )
      } else if ('userId' in updates && updates.userId === null && currentUserId) {
        await createNotification(
          currentUserId,
          'profile_unlinked',
          'Profile unlinked 🔓',
          `Your profile was unlinked from ${leagueName}`,
          { leagueId },
        )
      }

      refetch()
    } catch (err) {
      showError(err, 'Failed to update player.')
    }
  }

  async function handleDeletePlayer(playerId) {
    try {
      await deletePlayer(playerId)
      refetch()
    } catch (err) {
      showError(err, 'Failed to delete player.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !league) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2">
        <div className="text-[18px] font-bold">League not found</div>
        <button onClick={() => navigate('/')} className="text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer">
          ← Back to home
        </button>
      </div>
    )
  }

  // Settings tab appears only once the role is known and the user is admin
  const navItems = !roleLoading && isAdmin && !isGuest ? ADMIN_NAV_ITEMS : BASE_NAV_ITEMS

  return (
    <div className="screen bg-bg text-text">

      {/* ── Fixed top header ── */}
      <div className="screen__top flex items-center gap-2.5 px-4 pt-2.5 pb-4">
        <button
          onClick={() => navigate('/')}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-bold text-text leading-tight">{league.name}</div>
          <div className="text-[11px] text-dim">
            Season {new Date().getFullYear()}
            {league.location && <> · {league.location}</>}
          </div>
        </div>
        {/* Guest: show Log in button in header */}
        {isGuest && (
          <button
            onClick={() => navigate(`/login?next=/league/${id}`)}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-bold border-0 cursor-pointer shrink-0"
          >
            Log in
          </button>
        )}
        {/* Non-admin member: overflow menu with league info + leave action */}
        {!isGuest && !roleLoading && !isAdmin && (
          <LeagueHeaderMenu league={league} />
        )}
      </div>

      {/* ── Guest join banner (public leagues only) ── */}
      {isGuest && (
        <div className="mx-4 mb-3 flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-[14px] px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-accent leading-snug">Viewing as guest</div>
            <div className="text-[11px] text-dim mt-0.5">Log in or sign up to join this league.</div>
          </div>
          <button
            onClick={() => navigate(`/login?next=/league/${id}`)}
            className="shrink-0 px-3 py-2 rounded-xl bg-accent text-white text-[12px] font-bold border-0 cursor-pointer"
          >
            Join
          </button>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <main className="screen__body">
        <div className="px-4 pb-6">

          {effectiveTab === 'home' && (
            <RankingsTab
              league={league}
              isGuest={isGuest}
              currentUserId={profile?.id}
            />
          )}

          {effectiveTab === 'players' && !isGuest && isAdmin && (
            <LeaguePlayersTab
              league={league}
              isAdmin={isAdmin}
              onAdd={handleAddPlayer}
              onDelete={handleDeletePlayer}
              onUpdate={handleUpdatePlayer}
              currentUserId={profile?.id}
            />
          )}

          {effectiveTab === 'tournaments' && (
            <TournamentsTab league={league} isAdmin={isAdmin} isGuest={isGuest} />
          )}

          {effectiveTab === 'settings' && !isGuest && isAdmin && (
            <SettingsTab league={league} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} refetch={refetch} currentUserId={profile?.id} />
          )}

        </div>
      </main>

      {/* ── Bottom navigation ── */}
      <BottomNav
        items={navItems}
        active={effectiveTab}
        onChange={setActiveTab}
      />

    </div>
  )
}
