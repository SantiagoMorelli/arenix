import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav, SectionLabel } from '../components/ui-new'
import { useAuth } from '../contexts/AuthContext'
import { getMyLeagues, getLeagueById } from '../services/leagueService'

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

const GearIcon = ({ size = 20 }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </Svg>
)

// ─── Country → flag emoji ──────────────────────────────────────────────────────
const FLAG = {
  argentina: '🇦🇷', 'united states': '🇺🇸', brazil: '🇧🇷', spain: '🇪🇸',
  colombia: '🇨🇴', mexico: '🇲🇽', chile: '🇨🇱', uruguay: '🇺🇾',
  france: '🇫🇷', germany: '🇩🇪', italy: '🇮🇹', australia: '🇦🇺',
  portugal: '🇵🇹', japan: '🇯🇵', canada: '🇨🇦', uk: '🇬🇧',
  'united kingdom': '🇬🇧', netherlands: '🇳🇱', sweden: '🇸🇪', norway: '🇳🇴',
}
function countryFlag(country) {
  if (!country) return ''
  return FLAG[country.toLowerCase()] || ''
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAllMatches(tour) {
  return [
    ...(tour.groups   || []).flatMap(g => g.matches || []),
    ...(tour.knockout?.rounds || []).flatMap(r => r.matches || []),
    ...(tour.matches  || []),
  ]
}

function getTeamName(teamId, tournament, leaguePlayers) {
  const team = tournament.teams?.find(t => t.id === teamId)
  if (!team) return 'Unknown'
  return team.name || team.players?.map(pId => {
    const p = leaguePlayers?.find(p => p.id === pId)
    return p?.name?.split(' ')[0] || '?'
  }).join(' & ') || 'Team'
}

function isPlayerInTeam(playerId, teamId, tournament) {
  const team = tournament.teams?.find(t => t.id === teamId)
  if (!team || !team.players) return false
  return team.players.includes(playerId)
}

const TABS = [
  { id: 'stats',   label: 'Stats'   },
  { id: 'leagues', label: 'Leagues' },
  { id: 'matches', label: 'Matches' },
]

const NAV_ITEMS = [
  { id: 'home',    icon: <HomeIcon />, label: 'Home'    },
  { id: 'profile', icon: <StarIcon />, label: 'Profile' },
]

// ─── Pill tab bar ─────────────────────────────────────────────────────────────
function PillTabs({ tabs, active, onChange }) {
  return (
    <div className="flex bg-alt rounded-[10px] p-[3px] mb-3">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex-1 py-[7px] rounded-[8px]
            text-[10px] font-semibold
            cursor-pointer border-0 transition-colors
            ${active === tab.id
              ? 'bg-surface text-accent shadow-sm'
              : 'bg-transparent text-dim'}
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Tab: Stats (Performance section) ─────────────────────────────────────────
function StatsTab({ performance }) {
  return (
    <div>
      <SectionLabel color="dim">Performance</SectionLabel>
      <div className="bg-surface rounded-xl border border-line px-3.5 mb-2">
        {(performance || []).map((s, i, arr) => (
          <div
            key={i}
            className={`flex justify-between items-center py-[7px] ${i < arr.length - 1 ? 'border-b border-line' : ''}`}
          >
            <span className="text-[12px] text-text">{s.l}</span>
            <span className="text-[12px] font-bold text-accent">{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Leagues ─────────────────────────────────────────────────────────────
function LeaguesTab({ leagues }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel color="accent">My Leagues</SectionLabel>

      {leagues.length === 0 && (
        <div className="text-center text-[13px] text-dim py-8 border border-dashed border-line rounded-xl">
          You are not in any leagues yet.
        </div>
      )}

      {leagues.map((lg, i) => (
        <div key={i} className="bg-surface rounded-xl px-3.5 py-3 border border-line cursor-pointer active:opacity-80 transition-opacity">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0 mr-2">
              <div className="text-[14px] font-bold text-text">{lg.name}</div>
              <div className="text-[11px] text-dim">Season {lg.season} · {lg.players} players</div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <span className="text-[9px] font-bold text-accent bg-accent/15 px-2 py-[3px] rounded-md">
                {lg.rank}
              </span>
              {lg.role === 'admin' && (
                <span className="text-[9px] font-bold text-free bg-free/15 px-2 py-[3px] rounded-md uppercase">
                  Admin
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { n: lg.wins,        l: 'Wins'        },
              { n: lg.losses,      l: 'Losses'      },
              { n: lg.tournaments, l: 'Tournaments'  },
            ].map(s => (
              <div key={s.l} className="flex-1 bg-bg rounded-lg py-1.5 px-1 text-center">
                <div className="text-[13px] font-bold text-text">{s.n}</div>
                <div className="text-[8px] text-dim">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Match history ───────────────────────────────────────────────────────
function MatchesTab({ matches }) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel color="dim">Recent Matches</SectionLabel>

      {matches.length === 0 && (
        <div className="text-center text-[13px] text-dim py-8 border border-dashed border-line rounded-xl">
          No matches played yet.
        </div>
      )}

      {matches.map((m, i) => (
        <div key={i} className="bg-surface rounded-xl px-3.5 py-2.5 border border-line cursor-pointer active:opacity-80 transition-opacity">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-dim">{m.date}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-[2px] rounded ${
                m.type === 'Free Play'
                  ? 'text-free bg-free/15'
                  : 'text-accent bg-accent/15'
              }`}>
                {m.tourn}
              </span>
            </div>
            <span className={`text-[10px] font-bold ${m.won ? 'text-success' : 'text-error'}`}>
              {m.won ? 'WIN' : 'LOSS'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-text flex-1 truncate">{m.t1}</span>
            <div className="flex items-center gap-1 px-2">
              <span className={`text-[16px] font-extrabold ${m.s1 > m.s2 ? 'text-success' : 'text-text'}`}>{m.s1}</span>
              <span className="text-[10px] text-dim">–</span>
              <span className={`text-[16px] font-extrabold ${m.s2 > m.s1 ? 'text-success' : 'text-text'}`}>{m.s2}</span>
            </div>
            <span className="text-[12px] font-semibold text-text flex-1 text-right truncate">{m.t2}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Profile page ─────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('stats')
  const [data, setData] = useState({ leagues: [], matches: [], stats: {} })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAllData() {
      if (!profile) return
      try {
        const shallowLeagues = await getMyLeagues()
        const fullLeagues = await Promise.all(
          shallowLeagues.map(l => getLeagueById(l.id))
        )

        let totalWins = 0
        let totalLosses = 0
        let totalAces = 0
        let totalPointsScored = 0
        let serveWins = 0
        let bestStreak = 0
        const matchesList = []
        const userLeagues = []

        fullLeagues.forEach(league => {
          const myPlayerRecord = league.players?.find(p => p.userId === profile.id)

          if (myPlayerRecord) {
            totalWins   += (myPlayerRecord.wins   || 0)
            totalLosses += (myPlayerRecord.losses || 0)

            const sortedPlayers = [...league.players].sort((a, b) => (b.points || 0) - (a.points || 0))
            const myRank = sortedPlayers.findIndex(p => p.id === myPlayerRecord.id) + 1

            userLeagues.push({
              name:        league.name,
              season:      league.season,
              players:     league.players?.length || 0,
              rank:        myRank > 0 ? `#${myRank}` : '-',
              role:        league.myRole || 'player',
              wins:        `${myPlayerRecord.wins   || 0}W`,
              losses:      `${myPlayerRecord.losses || 0}L`,
              tournaments: String(league.tournaments?.length || 0),
            })

            league.tournaments?.forEach(tour => {
              const allMatches = getAllMatches(tour).filter(m => m.played)
              allMatches.forEach(m => {
                const inTeam1 = isPlayerInTeam(myPlayerRecord.id, m.team1, tour)
                const inTeam2 = isPlayerInTeam(myPlayerRecord.id, m.team2, tour)

                if (inTeam1 || inTeam2) {
                  const myTeamId  = inTeam1 ? m.team1 : m.team2
                  const myTeamNum = inTeam1 ? 1 : 2
                  const won       = m.winner === myTeamId

                  // Points scored from set-level scores
                  if (m.sets?.length > 0) {
                    totalPointsScored += m.sets.reduce(
                      (sum, s) => sum + (myTeamNum === 1 ? (s.s1 || 0) : (s.s2 || 0)), 0
                    )
                  }

                  // Aces, streak, serve wins from point log
                  if (m.log?.length > 0) {
                    const myLogs = m.log.filter(e => e.team === myTeamNum)
                    totalAces += myLogs.filter(e => e.pointType === 'ace').length
                    serveWins += myLogs.filter(e => e.serverTeam === myTeamNum).length
                    myLogs.forEach(e => { if ((e.streak || 0) > bestStreak) bestStreak = e.streak })
                  }

                  matchesList.push({
                    date:  tour.date || new Date(tour.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    tourn: tour.name,
                    t1:    getTeamName(m.team1, tour, league.players),
                    t2:    getTeamName(m.team2, tour, league.players),
                    s1:    m.score1,
                    s2:    m.score2,
                    won,
                    type:  'Tournament',
                  })
                }
              })
            })
          }
        })

        const totalMatches   = totalWins + totalLosses
        const winRate        = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0
        const pointsPerMatch = totalMatches > 0 ? (totalPointsScored / totalMatches).toFixed(1) : '-'
        const acesPerMatch   = totalMatches > 0 ? (totalAces / totalMatches).toFixed(1) : '-'
        const serveWinPct    = totalPointsScored > 0
          ? `${Math.round((serveWins / totalPointsScored) * 100)}%`
          : '-'

        setData({
          leagues: userLeagues,
          matches: matchesList.reverse(),
          stats: {
            top: [
              { value: String(totalMatches), label: 'Matches',  colorClass: 'text-accent'  },
              { value: `${totalWins}W`,      label: 'Wins',     colorClass: 'text-success' },
              { value: `${winRate}%`,        label: 'Win Rate', colorClass: 'text-free'    },
            ],
            detail: [
              { value: String(totalPointsScored),                  label: 'Total Points', emoji: '💥' },
              { value: String(totalAces),                          label: 'Aces',         emoji: '🎯' },
              { value: bestStreak > 0 ? String(bestStreak) : '-',  label: 'Best Streak',  emoji: '🔥' },
              { value: userLeagues[0]?.rank || '-',                label: 'Best Rank',    emoji: '🏆' },
            ],
            performance: [
              { l: 'Points per Match', v: pointsPerMatch },
              { l: 'Aces per Match',   v: acesPerMatch   },
              { l: 'Serve Win %',      v: serveWinPct    },
            ],
          },
        })
      } catch (err) {
        console.error('Failed to load profile data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAllData()
  }, [profile])

  const handleNavChange = (tab) => {
    if (tab === 'home')    navigate('/')
    else if (tab === 'profile') navigate('/profile')
  }

  const nickname    = profile?.nickname?.trim() || ''
  const displayName = nickname || profile?.full_name?.split(' ')[0] || 'Player'
  const initial     = displayName[0]?.toUpperCase() || '?'
  const flag        = countryFlag(profile?.country)
  const avatarUrl   = profile?.avatar_url?.startsWith('http') ? profile.avatar_url : null

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-bg text-text items-center justify-center">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pb-6">

          {/* ── Avatar + name row ── */}
          <div className="flex items-center gap-3.5 pt-4 mb-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-free flex items-center justify-center text-[22px] font-extrabold text-white flex-shrink-0">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[18px] font-bold text-text">{displayName}</span>
                {flag && <span className="text-[16px] leading-none">{flag}</span>}
              </div>
              {nickname && profile?.full_name && (
                <div className="text-[12px] text-dim truncate">{profile.full_name}</div>
              )}
              <div className="text-[11px] text-dim">Playing since {new Date(profile?.created_at || Date.now()).getFullYear()}</div>
            </div>
            <button className="text-dim cursor-pointer bg-transparent border-0 p-1" onClick={() => navigate('/settings')}>
              <GearIcon />
            </button>
          </div>

          {/* ── Top stats grid (3 col) ── */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {data.stats.top?.map(s => (
              <div key={s.label} className="bg-surface rounded-xl py-3 px-2 text-center border border-line">
                <div className={`text-[20px] font-extrabold leading-tight ${s.colorClass}`}>{s.value}</div>
                <div className="text-[9px] text-dim mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Detail stats grid (2×2) — always visible ── */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {data.stats.detail?.map(s => (
              <div key={s.label} className="bg-surface rounded-xl p-2.5 flex items-center gap-2.5 border border-line">
                <span className="text-[18px] leading-none">{s.emoji}</span>
                <div>
                  <div className="text-[16px] font-extrabold text-text leading-tight">{s.value}</div>
                  <div className="text-[9px] text-dim">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Pill tabs ── */}
          <PillTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {/* ── Tab content ── */}
          {activeTab === 'stats'   && <StatsTab   performance={data.stats.performance} />}
          {activeTab === 'leagues' && <LeaguesTab leagues={data.leagues} />}
          {activeTab === 'matches' && <MatchesTab matches={data.matches} />}

        </div>
      </main>

      {/* ── Bottom navigation ── */}
      <BottomNav
        items={NAV_ITEMS}
        active="profile"
        onChange={handleNavChange}
      />

    </div>
  )
}
