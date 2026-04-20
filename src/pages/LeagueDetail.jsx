import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { BottomNav, SectionLabel, AppBadge } from '../components/ui-new'
import LeaguePlayersTab from '../components/LeaguePlayersTab'

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

const BackIcon = () => (
  <Svg><polyline points="15 18 9 12 15 6" /></Svg>
)

const ChartIcon = () => (
  <Svg>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6"  y1="20" x2="6"  y2="14" />
  </Svg>
)

const UsersIcon = () => (
  <Svg>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </Svg>
)

const TrophyIcon = ({ size = 20 }) => (
  <Svg size={size}>
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22" />
    <path d="M18 2H6v7a6 6 0 1012 0V2z" />
  </Svg>
)

const GearIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </Svg>
)

const PlusIcon = ({ size = 14 }) => (
  <Svg size={size}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5"  y1="12" x2="19" y2="12" />
  </Svg>
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTournamentStatus(t) {
  if (t.status === 'completed') return { label: 'Completed', variant: 'dim' }
  if (['group', 'knockout', 'freeplay'].includes(t.phase)) return { label: 'In Progress', variant: 'success' }
  if (t.phase === 'setup') return { label: 'Setup', variant: 'accent' }
  return { label: 'Active', variant: 'success' }
}

function getTournamentPlayerCount(t) {
  return new Set((t.teams || []).flatMap(team => team.players || [])).size
}

const NAV_ITEMS = [
  { id: 'rankings',    icon: <ChartIcon />,  label: 'Rankings'    },
  { id: 'players',     icon: <UsersIcon />,  label: 'Players'     },
  { id: 'tournaments', icon: <TrophyIcon />, label: 'Tournaments' },
  { id: 'settings',    icon: <GearIcon />,   label: 'Settings'    },
]

// ─── LeagueDetail page ────────────────────────────────────────────────────────
export default function LeagueDetail() {
  const navigate   = useNavigate()
  const { id }     = useParams()
  const [activeTab, setActiveTab] = useState('rankings')

  const [leagues, setLeagues] = useLocalStorage('arenix_leagues', [])

  // Prefer the league matching the URL param; fall back to first league
  const league = leagues.find(l => l.id === id) || leagues[0] || null
  const leagueId = league?.id || id || 'league_default'

  const updateLeague = (updates) => {
    setLeagues(prev => prev.map(l => 
      l.id === leagueId ? { ...l, ...updates } : l
    ))
  }

  // Players sorted by points descending for the ranking list
  const rankedPlayers = [...(league?.players || [])].sort(
    (a, b) => (b.points || 0) - (a.points || 0)
  )

  // Most-recently-created tournaments first
  const tournaments = [...(league?.tournaments || [])].reverse()

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pb-6">

          {/* ── Header ── */}
          <div className="flex items-center gap-2.5 pt-2.5 pb-4">
            <button
              onClick={() => navigate('/')}
              className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text"
            >
              <BackIcon />
            </button>
            <div>
              <div className="text-[18px] font-bold text-text leading-tight">
                {league?.name || 'My League'}
              </div>
              <div className="text-[11px] text-dim">Season {league?.season}</div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════
              Rankings tab  — players ranked by points
          ════════════════════════════════════════════════ */}
          {(activeTab === 'rankings') && (
            <>
              <SectionLabel color="accent">Top Rankings</SectionLabel>

              {rankedPlayers.length > 0 ? (
                <div className="bg-surface rounded-[14px] overflow-hidden border border-line mb-[18px]">
                  {rankedPlayers.slice(0, 5).map((player, i) => (
                    <div
                      key={player.id}
                      className={`
                        flex items-center px-3.5 py-2.5
                        ${i < rankedPlayers.length - 1 ? 'border-b border-line' : ''}
                      `}
                    >
                      {/* Rank number — top-3 in accent */}
                      <span
                        className={`w-[22px] text-[13px] font-bold flex-shrink-0 ${i < 3 ? 'text-accent' : 'text-dim'}`}
                      >
                        {i + 1}
                      </span>

                      {/* Avatar initial */}
                      <div className="w-7 h-7 rounded-lg bg-alt flex items-center justify-center text-[12px] font-semibold text-text mr-2.5 flex-shrink-0">
                        {player.name[0]}
                      </div>

                      {/* Name */}
                      <span className="flex-1 text-[13px] font-medium text-text truncate">
                        {player.name}
                      </span>

                      {/* Points */}
                      <span className="text-[12px] font-semibold text-dim ml-2">
                        {player.points ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-dim text-center py-6 mb-4">
                  No players yet
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════
              Players tab   — Interactive Roster
          ════════════════════════════════════════════════ */}
          {activeTab === 'players' && (
             <LeaguePlayersTab league={league} updateLeague={updateLeague} />
          )}

          {/* ════════════════════════════════════════════════
              Rankings tab  — tournaments section (below rankings)
              Tournaments tab — tournaments section only
          ════════════════════════════════════════════════ */}
          {(activeTab === 'rankings' || activeTab === 'tournaments') && (
            <>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[12px] font-bold text-accent tracking-wide uppercase">
                  Tournaments
                </span>
                <button
                  onClick={() => navigate(`/league/${leagueId}/tournament/new`)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-0"
                >
                  <PlusIcon /> New
                </button>
              </div>

              {tournaments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {tournaments.slice(0, 5).map((t) => {
                    const { label, variant } = getTournamentStatus(t)
                    const pCount             = getTournamentPlayerCount(t)
                    return (
                      <div
                        key={t.id}
                        onClick={() => navigate(`/league/${id}/tournament/${t.id}`)}
                        className="bg-surface rounded-xl px-3.5 py-3 flex items-center gap-3 border border-line cursor-pointer active:opacity-80 transition-opacity"
                      >
                        <div className="w-9 h-9 rounded-[10px] bg-accent/15 flex items-center justify-center flex-shrink-0 text-accent">
                          <TrophyIcon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-text truncate">{t.name}</div>
                          <div className="text-[11px] text-dim">{pCount} players</div>
                        </div>
                        <AppBadge text={label} variant={variant} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-[13px] text-dim text-center py-6">
                  No tournaments yet —{' '}
                  <button
                    onClick={() => navigate(`/league/${leagueId}/tournament/new`)}
                    className="text-accent font-semibold bg-transparent border-0 cursor-pointer p-0"
                  >
                    create one
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Settings placeholder ── */}
          {activeTab === 'settings' && (
            <div className="text-[13px] text-dim text-center py-10">
              League settings coming soon
            </div>
          )}

        </div>
      </main>

      {/* ── Bottom navigation ── */}
      <BottomNav
        items={NAV_ITEMS}
        active={activeTab}
        onChange={setActiveTab}
      />

    </div>
  )
}
