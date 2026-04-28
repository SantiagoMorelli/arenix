import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getMyLeagues, getLeagueById, createLeague } from '../services/leagueService'
import { getFreePlays } from '../services/freePlayService'
import { BottomNav, IconButton, AppBadge } from '../components/ui-new'
import NotificationPanel from '../components/NotificationPanel'
import NotificationToast from '../components/NotificationToast'
import {
  getMyNotifications,
  markAllRead,
  subscribeToNotifications,
  isNotifAllowed,
} from '../services/notificationService'

// ─── Icons ───────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const BellIcon    = ({ size = 18 }) => <Svg size={size}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></Svg>
const GearIcon    = ({ size = 18 }) => <Svg size={size}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></Svg>
const HomeIcon    = ({ size = 20 }) => <Svg size={size}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Svg>
const StarIcon    = ({ size = 20 }) => <Svg size={size}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>
const TrophyIcon  = ({ size = 18 }) => <Svg size={size}><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></Svg>
const BallIcon    = ({ size = 18 }) => <Svg size={size}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20"/><path d="M2 12a14.5 14.5 0 0120 0"/></Svg>
const PlusIcon    = ({ size = 22 }) => <Svg size={size}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>

const LightningIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

// ─── Avatar ───────────────────────────────────────────────────────────────────
function hueFromString(str) {
  if (!str) return 200
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return h % 360
}

function UserAvatar({ name, userId, size = 40 }) {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
  const hue = hueFromString(userId || name || '')
  const bg  = `oklch(0.55 0.15 ${hue})`
  const r   = Math.round(size * 0.32)
  return (
    <div style={{
      width: size, height: size,
      borderRadius: r,
      background: bg,
      color: '#fff',
      fontSize: Math.round(size * 0.38),
      fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      letterSpacing: '-0.5px',
    }}>
      {initials}
    </div>
  )
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
function formatShortDate(dateVal) {
  if (!dateVal) return ''
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, day] = dateVal.split('-')
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return dateVal
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getAllMatches(tour) {
  return [
    ...(tour.groups   || []).flatMap(g => g.matches || []),
    ...(tour.knockout?.rounds || []).flatMap(r => r.matches || []),
    ...(tour.matches  || []),
  ]
}

function phaseLabel(tour) {
  if (tour.status === 'completed') return 'Completed'
  const p = tour.phase
  if (p === 'setup')    return 'Setup'
  if (p === 'group')    return 'Group Stage'
  if (p === 'knockout') return 'Knockout'
  if (p === 'freeplay') return 'Round Robin'
  return 'Active'
}

const NAV_ITEMS = [
  { id: 'home',    icon: <HomeIcon />, label: 'Home'    },
  { id: 'profile', icon: <StarIcon />, label: 'Profile' },
]

// ─── Home page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { profile, isSuperAdmin, canCreateLeague } = useAuth()
  const canCreate = isSuperAdmin || canCreateLeague

  const [leagues,        setLeagues]        = useState([])
  const [recentFreePlay, setRecentFreePlay] = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [showNotifs,     setShowNotifs]     = useState(false)
  const [showCreate,     setShowCreate]     = useState(false)
  const [newName,        setNewName]        = useState('')
  const [newLocation,    setNewLocation]    = useState('')
  const [newVisibility,  setNewVisibility]  = useState('public')
  const [creating,       setCreating]       = useState(false)
  const [notifications,  setNotifications]  = useState([])
  const [toastNotif,     setToastNotif]     = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const shallowLeagues = await getMyLeagues()
        if (shallowLeagues.length > 0) {
          const activeLeagueId = shallowLeagues[0].id
          const [fullLeague, freePlays] = await Promise.all([
            getLeagueById(activeLeagueId),
            getFreePlays(activeLeagueId)
          ])
          setLeagues([fullLeague, ...shallowLeagues.slice(1)])
          if (freePlays.length > 0) setRecentFreePlay(freePlays[0])
        } else {
          setLeagues([])
        }
      } catch (err) {
        console.error('Failed to load home data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    getMyNotifications().then(setNotifications)

    let unsubscribe
    if (profile?.id) {
      unsubscribe = subscribeToNotifications(profile.id, newNotif => {
        setNotifications(prev => [newNotif, ...prev])
        if (isNotifAllowed(newNotif.type, profile?.notification_prefs)) {
          setToastNotif(newNotif)
        }
      })
    }
    return () => { if (unsubscribe) unsubscribe() }
  }, [profile?.id])

  const league        = leagues[0] || null
  const tournaments   = league?.tournaments || []
  const leaguePlayers = league?.players     || []

  let myRank        = null
  let myWins        = 0
  let myLosses      = 0
  let myMatches     = 0
  let myTournaments = 0

  if (profile && leaguePlayers.length > 0) {
    const myPlayerRecord = leaguePlayers.find(p => p.userId === profile.id)
    if (myPlayerRecord) {
      const sortedPlayers = [...leaguePlayers].sort((a, b) => (b.points || 0) - (a.points || 0))
      const rankIndex = sortedPlayers.findIndex(p => p.id === myPlayerRecord.id)
      if (rankIndex >= 0) myRank = rankIndex + 1

      tournaments.forEach(tour => {
        const allMatches = getAllMatches(tour).filter(m => m.played)
        let playedInThisTournament = false
        allMatches.forEach(m => {
          const inTeam1 = tour.teams?.find(t => t.id === m.team1)?.players?.includes(myPlayerRecord.id)
          const inTeam2 = tour.teams?.find(t => t.id === m.team2)?.players?.includes(myPlayerRecord.id)
          if (inTeam1 || inTeam2) {
            playedInThisTournament = true
            myMatches++
            const myTeamId = inTeam1 ? m.team1 : m.team2
            if (m.winner === myTeamId) myWins++
            else myLosses++
          }
        })
        if (playedInThisTournament) myTournaments++
      })
    }
  }

  const leagueStats = [
    { value: String(myTournaments),        label: 'Tourneys' },
    { value: String(myMatches),            label: 'Matches'  },
    { value: `${myWins}W-${myLosses}L`,   label: 'Record'   },
  ]

  // Recent activity rows
  const recentActivity = []

  if (tournaments.length > 0) {
    const lastTour = tournaments[tournaments.length - 1]
    const isLive   = lastTour.status !== 'completed'
    recentActivity.push({
      id:     'tour-' + lastTour.id,
      title:  lastTour.name,
      sub:    `${phaseLabel(lastTour)} · ${formatShortDate(lastTour.date || lastTour.created_at)}`,
      badge:  isLive ? 'LIVE' : 'Done',
      kind:   isLive ? 'live' : 'done',
      Icon:   TrophyIcon,
      iconBg: 'bg-accent/15',
      iconColor: 'text-accent',
      onClick: () => navigate(`/league/${league.id}/tournament/${lastTour.id}`),
    })
  }

  if (recentFreePlay) {
    const fpPlayersCount = Array.from(new Set(
      (recentFreePlay.games || []).flatMap(g => {
        const t1 = recentFreePlay.teams?.find(t => t.id === g.team1_id)?.players || []
        const t2 = recentFreePlay.teams?.find(t => t.id === g.team2_id)?.players || []
        return [...t1, ...t2]
      })
    )).length

    recentActivity.push({
      id:        'fp-' + recentFreePlay.id,
      title:     recentFreePlay.name || 'Free Play',
      sub:       `${formatShortDate(recentFreePlay.created_at)} · ${fpPlayersCount} players`,
      badge:     'Done',
      kind:      'done',
      Icon:      BallIcon,
      iconBg:    'bg-free/15',
      iconColor: 'text-free',
      onClick:   () => navigate('/free-play'),
    })
  }

  async function handleCreateLeague(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const lg = await createLeague({ name: newName.trim(), location: newLocation.trim(), visibility: newVisibility })
      setLeagues(prev => [...prev, lg])
      setShowCreate(false)
      setNewName('')
      setNewLocation('')
      setNewVisibility('public')
      navigate(`/league/${lg.id}`)
    } finally {
      setCreating(false)
    }
  }

  const handleNavChange = (tab) => {
    if (tab === 'home') navigate('/')
    else if (tab === 'profile') navigate('/profile')
  }

  const visibleNotifications = notifications.filter(n => isNotifAllowed(n.type, profile?.notification_prefs))
  const unreadCount           = visibleNotifications.filter(n => !n.read).length

  async function handleMarkAllRead() {
    await markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function handleRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const displayName = profile?.full_name?.split(' ')[0] || 'Player'

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-bg text-text items-center justify-center">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">

      <NotificationToast notification={toastNotif} onDismiss={() => setToastNotif(null)} />
      <NotificationPanel
        isOpen={showNotifs}
        onClose={() => setShowNotifs(false)}
        notifications={visibleNotifications}
        onMarkAllRead={handleMarkAllRead}
        onRead={handleRead}
      />

      {/* ── Scrollable body ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pb-6">

          {/* ── Header ── */}
          <div style={{ padding: '14px 0 18px' }} className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <UserAvatar name={profile?.full_name} userId={profile?.id} size={40} />
              <div>
                <div className="text-[12px] text-dim">Welcome back</div>
                <div className="text-[18px] font-bold text-text leading-tight">{displayName}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <IconButton badge={unreadCount > 0 ? unreadCount : undefined} onClick={() => setShowNotifs(v => !v)}>
                <BellIcon />
              </IconButton>
              {canCreate && (
                <IconButton onClick={() => setShowCreate(true)}>
                  <PlusIcon size={18} />
                </IconButton>
              )}
              <IconButton onClick={() => navigate('/settings')}>
                <GearIcon />
              </IconButton>
            </div>
          </div>

          {/* ── League hero card ── */}
          {league ? (
            <div
              onClick={() => navigate(`/league/${league.id}`)}
              className="rounded-[14px] mb-3.5 border cursor-pointer active:opacity-80 transition-opacity overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, var(--c-surface), var(--c-alt))',
                borderColor: 'color-mix(in srgb, var(--c-accent) 40%, transparent)',
                padding: '18px 18px 14px',
              }}
            >
              {/* Top row: league name + rank */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold tracking-[1.2px] uppercase text-accent mb-1.5">
                    My League
                  </div>
                  <div className="font-display text-[30px] leading-none text-text mb-1">
                    {league.name}
                  </div>
                  <div className="text-[12px] text-dim">
                    {league.season ? `Season ${league.season}` : 'Season 2026'} · {leaguePlayers.length} players
                  </div>
                </div>
                {myRank !== null && (
                  <div
                    className="rounded-[10px] text-center shrink-0"
                    style={{
                      background: 'color-mix(in srgb, var(--c-accent) 15%, transparent)',
                      color: 'var(--c-accent)',
                      padding: '8px 12px',
                    }}
                  >
                    <div className="text-[9px] font-bold tracking-[1px] uppercase">Rank</div>
                    <div className="font-display text-[26px] leading-none">#{myRank}</div>
                  </div>
                )}
              </div>

              {/* Stat tiles */}
              <div className="flex gap-2 mt-4">
                {leagueStats.map(s => (
                  <div
                    key={s.label}
                    className="flex-1 rounded-[10px] text-center"
                    style={{ background: 'var(--c-bg)', padding: '10px 4px' }}
                  >
                    <div className="font-display text-[20px] leading-none text-text">{s.value}</div>
                    <div className="text-[9px] text-dim mt-0.5 tracking-[0.3px]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* No league state */
            <div
              className="rounded-[14px] mb-3.5 border border-dashed text-center"
              style={{
                background: 'linear-gradient(135deg, var(--c-surface), var(--c-alt))',
                borderColor: 'color-mix(in srgb, var(--c-accent) 40%, transparent)',
                padding: '18px',
              }}
            >
              <div className="text-[16px] font-bold text-text mb-1">No leagues yet</div>
              <div className="text-[13px] text-dim mb-4">
                Join a league via invite link{canCreate ? ' or create a new one' : ''}.
              </div>
              {canCreate && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full py-3 rounded-xl bg-accent text-white font-bold text-[13px]"
                >
                  + Create League
                </button>
              )}
            </div>
          )}

          {/* ── Free Play CTA ── */}
          <button
            onClick={() => navigate('/free-play')}
            className="w-full text-left rounded-[14px] mb-5 border cursor-pointer active:opacity-80 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--c-free) 15%, transparent), var(--c-surface))',
              borderColor: 'color-mix(in srgb, var(--c-free) 30%, transparent)',
              padding: '16px',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}
          >
            <div
              className="rounded-[14px] flex items-center justify-center text-free shrink-0"
              style={{
                width: 52, height: 52,
                background: 'color-mix(in srgb, var(--c-free) 15%, transparent)',
              }}
            >
              <LightningIcon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-text">Free Play</div>
              <div className="text-[11px] text-dim mt-0.5">Quick match · Any players · No league</div>
            </div>
            <span className="text-free shrink-0">
              <PlusIcon size={22} />
            </span>
          </button>

          {/* ── Recent section header ── */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-[11px] font-bold tracking-[1.2px] uppercase text-dim">Recent</div>
            <button className="text-[11px] font-semibold text-accent active:opacity-70 transition-opacity">
              See all
            </button>
          </div>

          {/* ── Activity rows ── */}
          {recentActivity.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentActivity.map(item => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-dim text-center py-6">
              No recent activity yet
            </div>
          )}

        </div>
      </main>

      {/* ── Bottom nav ── */}
      <BottomNav items={NAV_ITEMS} active="home" onChange={handleNavChange} />

      {/* ── Create League modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
          <div className="bg-surface border border-line rounded-[14px] w-full max-w-[420px] p-5">
            <div className="text-[17px] font-bold text-text mb-4">New League</div>
            <form onSubmit={handleCreateLeague} className="flex flex-col gap-3">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="League name"
                className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim outline-none focus:border-accent"
              />
              <input
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                placeholder="Location (optional)"
                className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewVisibility('public')}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-colors ${
                    newVisibility === 'public'
                      ? 'bg-accent text-white border-accent'
                      : 'bg-bg text-dim border-line'
                  }`}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setNewVisibility('private')}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-colors ${
                    newVisibility === 'private'
                      ? 'bg-accent text-white border-accent'
                      : 'bg-bg text-dim border-line'
                  }`}
                >
                  Private
                </button>
              </div>
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="w-full py-3.5 rounded-xl bg-accent text-white font-bold text-[14px] disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create League'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(''); setNewLocation(''); setNewVisibility('public') }}
                className="w-full py-3 rounded-xl text-dim font-semibold text-[13px] bg-transparent border-0"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Activity row ─────────────────────────────────────────────────────────────
function ActivityRow({ item }) {
  const badgeVariant =
    item.kind === 'live' ? 'success' :
    item.kind === 'won'  ? 'accent'  : 'dim'

  return (
    <div
      onClick={item.onClick}
      className="bg-surface rounded-[14px] border border-line cursor-pointer active:opacity-80 transition-opacity"
      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <div
        className={`rounded-[10px] flex items-center justify-center shrink-0 ${item.iconBg} ${item.iconColor}`}
        style={{ width: 38, height: 38 }}
      >
        <item.Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-text truncate">{item.title}</div>
        <div className="text-[11px] text-dim mt-0.5 truncate">{item.sub}</div>
      </div>
      <AppBadge text={item.badge} variant={badgeVariant} />
    </div>
  )
}
