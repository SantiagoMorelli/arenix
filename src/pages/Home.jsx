import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getMyLeagues, createLeague } from '../services/leagueService'
import { BottomNav, IconButton, SectionLabel, AppBadge } from '../components/ui-new'
import NotificationPanel from '../components/NotificationPanel'

// ─── Inline SVG icons ────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    {children}
  </svg>
)

const BellIcon = () => (
  <Svg>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </Svg>
)

const GearIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </Svg>
)

const HomeIcon = () => (
  <Svg>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
)

const StarIcon = () => (
  <Svg>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
)

const TrophyIcon = ({ size = 18 }) => (
  <Svg size={size}>
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22" />
    <path d="M18 2H6v7a6 6 0 1012 0V2z" />
  </Svg>
)

const PlayIcon = ({ size = 22 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
  </svg>
)

const PlusIcon = ({ size = 18 }) => (
  <Svg size={size}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5"  y1="12" x2="19" y2="12" />
  </Svg>
)

// ─── Data helpers ─────────────────────────────────────────────────────────────

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

function phaseBadgeVariant(tour) {
  if (tour.status === 'completed') return 'dim'
  if (tour.phase === 'group' || tour.phase === 'knockout' || tour.phase === 'freeplay') return 'success'
  return 'accent'
}

const NAV_ITEMS = [
  { id: 'home',    icon: <HomeIcon />, label: 'Home'    },
  { id: 'profile', icon: <StarIcon />, label: 'Profile' },
]

// ─── Home page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { profile, isSuperAdmin } = useAuth()

  const [leagues,    setLeagues]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [creating,   setCreating]   = useState(false)

  useEffect(() => {
    getMyLeagues()
      .then(setLeagues)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const league        = leagues[0] || null
  const tournaments   = league?.tournaments || []
  const leaguePlayers = league?.players     || []
  const totalMatches  = tournaments.flatMap(t => getAllMatches(t)).filter(m => m.played).length
  const totalTeams    = tournaments.reduce((n, t) => n + (t.teams?.length || 0), 0)

  const leagueStats = [
    { value: String(tournaments.length), label: 'Tournaments' },
    { value: String(totalMatches),       label: 'Matches'     },
    { value: String(totalTeams),         label: 'Teams'       },
  ]

  const recentActivity = [
    ...[...tournaments].reverse().slice(0, 2).map(t => ({
      id:           'tour-' + t.id,
      title:        t.name,
      sub:          `Tournament · ${t.date}`,
      badge:        phaseLabel(t),
      badgeVariant: phaseBadgeVariant(t),
      iconBg:       'bg-accent/15',
      iconColor:    'text-accent',
      Icon:         TrophyIcon,
    })),
  ].slice(0, 4)

  async function handleCreateLeague(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const league = await createLeague({ name: newName.trim() })
      setLeagues(prev => [...prev, league])
      setShowCreate(false)
      setNewName('')
      navigate(`/league/${league.id}`)
    } finally {
      setCreating(false)
    }
  }

  const handleNavChange = (tab) => {
    if (tab === 'home') navigate('/')
    else if (tab === 'profile') navigate('/profile')
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

      {/* Notification panel overlay */}
      <NotificationPanel isOpen={showNotifs} onClose={() => setShowNotifs(false)} />

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pb-6">

          {/* ── Header ── */}
          <div className="flex justify-between items-center py-3 mb-1">
            <div>
              <div className="text-[13px] text-dim font-medium">Welcome back</div>
              <div className="text-[22px] font-bold text-text leading-tight">{displayName} 🏐</div>
            </div>
            <div className="flex gap-2 text-dim">
              <IconButton badge={3} onClick={() => setShowNotifs(v => !v)}>
                <BellIcon />
              </IconButton>
              <IconButton onClick={() => setShowCreate(true)}>
                <PlusIcon />
              </IconButton>
              <IconButton onClick={() => navigate('/settings')}>
                <GearIcon />
              </IconButton>
            </div>
          </div>

          {/* ── League card ── */}
          {league ? (
            <div
              onClick={() => navigate(`/league/${league.id}`)}
              className="bg-gradient-to-br from-surface to-alt rounded-2xl p-[18px] mb-3.5 border border-accent/40 cursor-pointer active:opacity-80 transition-opacity"
            >
              <div className="flex justify-between items-start mb-3.5">
                <div>
                  <div className="text-[10px] text-accent font-bold tracking-[1.5px] uppercase mb-1">
                    My League
                  </div>
                  <div className="text-[17px] font-bold text-text">{league.name}</div>
                  <div className="text-[12px] text-dim mt-0.5">
                    Season {league.season} · {leaguePlayers.length} players
                  </div>
                </div>
                <div className="bg-accent/15 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-accent shrink-0">
                  {tournaments.length} Tourn.
                </div>
              </div>
              <div className="flex gap-2">
                {leagueStats.map(s => (
                  <div key={s.label} className="flex-1 bg-bg rounded-[10px] py-2 px-1.5 text-center">
                    <div className="text-[15px] font-bold text-text">{s.value}</div>
                    <div className="text-[9px] text-dim mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-surface to-alt rounded-2xl p-[18px] mb-3.5 border border-dashed border-accent/40 text-center">
              <div className="text-[13px] text-dim mb-2">No leagues yet</div>
              <div className="text-[11px] text-dim mb-4">Join a league via invite link or create a new one.</div>
              <button
                onClick={() => setShowCreate(true)}
                className="w-full py-3 rounded-xl bg-accent text-white font-bold text-[13px]"
              >
                + Create League
              </button>
            </div>
          )}

          {/* ── Free Play button ── */}
          <div
            onClick={() => navigate('/free-play')}
            className="bg-gradient-to-br from-free/15 to-surface rounded-2xl p-4 mb-[18px] border border-free/30 flex items-center gap-3.5 cursor-pointer active:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 rounded-[14px] bg-free/15 flex items-center justify-center text-free flex-shrink-0">
              <PlayIcon />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-text">Free Play</div>
              <div className="text-[11px] text-dim">Quick match · Any players · No league</div>
            </div>
            <span className="text-free flex-shrink-0">
              <PlusIcon />
            </span>
          </div>

          {/* ── Recent activity ── */}
          <SectionLabel color="dim">Recent</SectionLabel>

          {recentActivity.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentActivity.map(item => (
                <div
                  key={item.id}
                  className="bg-surface rounded-xl px-3.5 py-3 flex items-center gap-3 border border-line cursor-pointer active:opacity-80 transition-opacity"
                >
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${item.iconBg} ${item.iconColor}`}>
                    <item.Icon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-text truncate">{item.title}</div>
                    <div className="text-[11px] text-dim truncate">{item.sub}</div>
                  </div>
                  <AppBadge text={item.badge} variant={item.badgeVariant} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-dim text-center py-6">
              No recent activity yet
            </div>
          )}

        </div>
      </main>

      {/* ── Bottom navigation ── */}
      <BottomNav
        items={NAV_ITEMS}
        active="home"
        onChange={handleNavChange}
      />

      {/* ── Create League modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-[420px] p-5">
            <div className="text-[17px] font-bold text-text mb-4">New League</div>
            <form onSubmit={handleCreateLeague} className="flex flex-col gap-3">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="League name"
                className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="w-full py-3.5 rounded-xl bg-accent text-white font-bold text-[14px] disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create League'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName('') }}
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
