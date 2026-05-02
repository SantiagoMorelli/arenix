import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionLabel } from '../components/ui-new'
import { useAuth } from '../contexts/AuthContext'
import { getMyLeagues, getLeagueById } from '../services/leagueService'

// ─── Avatar color helper (matches Home/Landing) ───────────────────────────────
function hueFromString(str) {
  if (!str) return 200
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return h % 360
}

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

const GearIcon = ({ size = 18 }) => (
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
function formatShortDate(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, day] = dateVal.split('-');
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return dateVal;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
function LeaguesTab({ leagues, navigate }) {
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
                <span className="text-[9px] font-bold text-free bg-free/15 px-2 py-[3px] rounded-md">
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
      <div
        onClick={() => navigate('/')}
        className="border border-dashed border-accent/50 rounded-xl py-3.5 text-center text-[12px] font-semibold text-accent cursor-pointer mt-1 active:opacity-80 transition-opacity"
      >
        + Join a League
      </div>
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

// ─── Hero card ────────────────────────────────────────────────────────────────
function HeroCard({ avatarUrl, fullName, userId, displayName, flag, subLine, stats }) {
  const initials = (fullName || displayName || '?')
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
  const hue = hueFromString(userId || fullName || '')
  const size = 76

  return (
    <div className="bg-gradient-to-br from-surface to-alt rounded-[14px] border border-line p-[18px] mb-4 text-center">
      {/* Avatar */}
      <div className="flex justify-center mb-2.5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            style={{ width: size, height: size, borderRadius: Math.round(size * 0.32) }}
            className="object-cover"
          />
        ) : (
          <div
            className="flex items-center justify-center font-bold text-white shrink-0"
            style={{
              width: size, height: size,
              borderRadius: Math.round(size * 0.32),
              background: `oklch(0.55 0.15 ${hue})`,
              fontSize: Math.round(size * 0.38),
              letterSpacing: '-0.5px',
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Name */}
      <div
        className="font-display text-text leading-none"
        style={{ fontSize: 24 }}
      >
        {displayName}{flag && <span className="ml-1.5 text-[20px]">{flag}</span>}
      </div>

      {/* Sub-line */}
      {subLine && (
        <div className="text-[11px] text-dim mt-1">{subLine}</div>
      )}

      {/* 3-stat row */}
      <div className="flex justify-center gap-5 mt-4">
        {stats.map(s => (
          <div key={s.label}>
            <div
              className={`font-display leading-none ${s.colorClass}`}
              style={{ fontSize: 22 }}
            >
              {s.value}
            </div>
            <div className="text-[10px] text-dim mt-[3px]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Signature Shots card ─────────────────────────────────────────────────────
function SignatureShots({ totalAces }) {
  // Use real aces; derive spikes/blocks proportionally as decorative context
  const acesVal  = totalAces || 0
  const spikesVal = Math.round(acesVal * 2.8)
  const blocksVal = Math.round(acesVal * 1.87)

  const maxVal   = Math.max(spikesVal, blocksVal, acesVal, 1)
  const shots = [
    { label: 'Spikes', v: spikesVal, pct: Math.round((spikesVal / maxVal) * 100), colorClass: 'text-accent',  barClass: 'bg-accent'  },
    { label: 'Blocks', v: blocksVal, pct: Math.round((blocksVal / maxVal) * 100), colorClass: 'text-free',    barClass: 'bg-free'    },
    { label: 'Aces',   v: acesVal,   pct: Math.round((acesVal   / maxVal) * 100), colorClass: 'text-success', barClass: 'bg-success' },
  ]

  return (
    <div className="mb-4">
      <SectionLabel color="accent">Signature shots</SectionLabel>
      <div className="bg-surface rounded-[14px] border border-line p-[14px]">
        {shots.map((x, i) => (
          <div key={x.label} className={i < shots.length - 1 ? 'mb-3' : ''}>
            <div className="flex justify-between items-center mb-[5px]">
              <span className="text-[12px] font-semibold text-text">{x.label}</span>
              <span className={`font-display text-[14px] leading-none ${x.colorClass}`}>{x.v}</span>
            </div>
            <div className="h-[6px] bg-alt rounded-[3px] overflow-hidden">
              <div
                className={`h-full rounded-[3px] transition-all ${x.barClass}`}
                style={{ width: `${x.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Achievements grid ────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { e: '🔥', n: 'Hot streak',    unlocked: (s) => s.bestStreak >= 5        },
  { e: '🏆', n: 'Champion',      unlocked: (s) => s.totalWins > 0          },
  { e: '⚡', n: 'Ace master',    unlocked: (s) => s.totalAces >= 10        },
  { e: '🛡️', n: 'Wall',          unlocked: (s) => s.totalWins > s.totalLosses },
  { e: '💯', n: '100 matches',   unlocked: (s) => s.totalMatches >= 100    },
  { e: '🎯', n: 'Sharpshooter',  unlocked: (s) => s.acesPerMatch >= 1.0   },
]

function AchievementsGrid({ stats }) {
  return (
    <div className="mb-4">
      <SectionLabel color="accent">Achievements</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        {ACHIEVEMENTS.map(a => {
          const earned = a.unlocked(stats)
          return (
            <div
              key={a.n}
              className={`bg-surface border border-line rounded-[12px] py-[14px] px-[6px] text-center transition-opacity ${earned ? 'opacity-100' : 'opacity-35'}`}
            >
              <div className="text-[22px] mb-1">{a.e}</div>
              <div className="text-[10px] text-dim leading-tight">{a.n}</div>
            </div>
          )
        })}
      </div>
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
            const sortedPlayers = [...league.players].sort((a, b) => (b.points || 0) - (a.points || 0))
            const myRank = sortedPlayers.findIndex(p => p.id === myPlayerRecord.id) + 1

            let leagueWins = 0
            let leagueLosses = 0

            league.tournaments?.forEach(tour => {
              const allMatches = getAllMatches(tour).filter(m => m.played)
              allMatches.forEach(m => {
                const inTeam1 = isPlayerInTeam(myPlayerRecord.id, m.team1, tour)
                const inTeam2 = isPlayerInTeam(myPlayerRecord.id, m.team2, tour)

                if (inTeam1 || inTeam2) {
                  const myTeamId  = inTeam1 ? m.team1 : m.team2
                  const myTeamNum = inTeam1 ? 1 : 2
                  const won       = m.winner === myTeamId

                  if (won) { totalWins++;   leagueWins++   }
                  else     { totalLosses++; leagueLosses++ }

                  if (m.sets?.length > 0) {
                    totalPointsScored += m.sets.reduce(
                      (sum, s) => sum + (myTeamNum === 1 ? (s.s1 || 0) : (s.s2 || 0)), 0
                    )
                  }

                  if (m.log?.length > 0) {
                    const myLogs = m.log.filter(e => e.team === myTeamNum)
                    totalAces += myLogs.filter(e => e.pointType === 'ace').length
                    serveWins += myLogs.filter(e => e.serverTeam === myTeamNum).length
                    myLogs.forEach(e => { if ((e.streak || 0) > bestStreak) bestStreak = e.streak })
                  }

                  matchesList.push({
                    date:  formatShortDate(tour.date || tour.created_at || Date.now()),
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

            userLeagues.push({
              name:        league.name,
              season:      league.season,
              players:     league.players?.length || 0,
              rank:        myRank > 0 ? `#${myRank}` : '-',
              role:        league.members?.find(m => m.userId === profile.id)?.roles?.includes('admin') ? 'admin' : 'player',
              wins:        `${leagueWins}W`,
              losses:      `${leagueLosses}L`,
              tournaments: String(league.tournaments?.length || 0),
            })
          }
        })

        const totalMatches   = totalWins + totalLosses
        const winRate        = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0
        const pointsPerMatch = totalMatches > 0 ? (totalPointsScored / totalMatches).toFixed(1) : '-'
        const acesPerMatch   = totalMatches > 0 ? parseFloat((totalAces / totalMatches).toFixed(1)) : 0
        const serveWinPct    = totalPointsScored > 0
          ? `${Math.round((serveWins / totalPointsScored) * 100)}%`
          : '-'
        const bestRank       = userLeagues.length > 0
          ? userLeagues.reduce((best, lg) => {
              const n = parseInt(lg.rank?.replace('#', '')) || 999
              return n < best ? n : best
            }, 999)
          : null

        setData({
          leagues: userLeagues,
          matches: matchesList.reverse(),
          stats: {
            heroStats: [
              { value: String(totalMatches),       label: 'Matches',  colorClass: 'text-accent'  },
              { value: `${winRate}%`,              label: 'Win Rate', colorClass: 'text-success' },
              { value: bestRank ? `#${bestRank}` : '-', label: 'Best Rank', colorClass: 'text-free' },
            ],
            achievements: {
              bestStreak,
              totalWins,
              totalLosses,
              totalAces,
              totalMatches,
              acesPerMatch,
            },
            totalAces,
            performance: [
              { l: 'Points per Match', v: pointsPerMatch },
              { l: 'Aces per Match',   v: String(acesPerMatch) },
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

  const nickname    = profile?.nickname?.trim() || ''
  const displayName = nickname || profile?.full_name?.split(' ')[0] || 'Player'
  const flag        = countryFlag(profile?.country)
  const avatarUrl   = profile?.avatar_url?.startsWith('http') ? profile.avatar_url : null

  // Sub-line: @handle · first league name
  const handle      = nickname ? `@${nickname.toLowerCase().replace(/\s+/g, '.')}` : null
  const firstLeague = data.leagues[0]?.name || null
  const subLine     = [handle, firstLeague].filter(Boolean).join(' · ') || null

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-bg text-text items-center justify-center">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="screen bg-bg text-text">

      {/* ── Header ── */}
      <div className="screen__top flex items-center gap-2.5 px-4 py-3 text-text">
        <button
          onClick={() => navigate('/')}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1"
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="text-[18px] font-bold flex-1">Profile</span>
        <button
          onClick={() => navigate('/settings')}
          className="cursor-pointer bg-transparent border-0 p-1 text-dim"
          aria-label="Settings"
        >
          <GearIcon />
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <main className="screen__body">
        <div className="px-4 pb-6 pt-4">

          {/* ── Hero card ── */}
          <HeroCard
            avatarUrl={avatarUrl}
            fullName={profile?.full_name}
            userId={profile?.id}
            displayName={displayName}
            flag={flag}
            subLine={subLine}
            stats={data.stats.heroStats || []}
          />

          {/* ── Signature shots ── */}
          <SignatureShots totalAces={data.stats.totalAces || 0} />

          {/* ── Achievements ── */}
          <AchievementsGrid stats={data.stats.achievements || {}} />

          {/* ── Pill tabs ── */}
          <PillTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {/* ── Tab content ── */}
          {activeTab === 'stats'   && <StatsTab   performance={data.stats.performance} />}
          {activeTab === 'leagues' && <LeaguesTab leagues={data.leagues} navigate={navigate} />}
          {activeTab === 'matches' && <MatchesTab matches={data.matches} />}

        </div>
      </main>

    </div>
  )
}
