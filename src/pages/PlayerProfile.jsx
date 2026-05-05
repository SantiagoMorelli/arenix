import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PillTabs } from '../components/ui-new'
import ProfileHeroCard from '../components/profile/ProfileHeroCard'
import AchievementsSection from '../components/profile/AchievementsSection'
import PlayerStatsSection from '../components/profile/PlayerStatsSection'
import { evaluateAchievements } from '../lib/achievements'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { usePlayerStatsForUser } from '../hooks/usePlayerStatsForUser'

// ── Helpers ───────────────────────────────────────────────────────────────────
function avatarBg(seed) {
  let h = 0; const s = String(seed)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff
  return `oklch(0.38 0.13 ${h % 360})`
}

const GENDER_LABEL = { F: 'Female', M: 'Male', X: 'Other', male: 'Male', female: 'Female', other: 'Other' }
const levelCap = v => (v ? v[0].toUpperCase() + v.slice(1) : '—')

function formatShortDate(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getAllMatches(tour) {
  return [
    ...((tour.groups || []).flatMap(g => g.matches || [])),
    ...((tour.knockout?.rounds || []).flatMap(r => r.matches || [])),
    ...(tour.matches || []),
  ]
}

// ── Shared: Recent matches list ───────────────────────────────────────────────
function MatchList({ matches }) {
  if (matches.length === 0) {
    return (
      <div className="text-center text-[13px] text-dim py-8 border border-dashed border-line rounded-xl">
        No matches played yet.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      {matches.slice(0, 30).map(m => (
        <div key={m.matchId} className="bg-surface rounded-xl px-3.5 py-2.5 border border-line">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-dim">{formatShortDate(m.date)}</span>
              <span className="text-[9px] font-semibold px-1.5 py-[2px] rounded text-accent bg-accent/15">
                {m.tournamentName}
              </span>
            </div>
            <span className={`text-[10px] font-bold ${m.won ? 'text-success' : 'text-error'}`}>
              {m.won ? 'WIN' : 'LOSS'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-text flex-1 truncate">vs {m.opponentName}</span>
            <div className="flex items-center gap-1 px-2">
              <span className={`text-[16px] font-extrabold ${m.score1 > m.score2 ? 'text-success' : 'text-text'}`}>{m.score1}</span>
              <span className="text-[10px] text-dim">–</span>
              <span className={`text-[16px] font-extrabold ${m.score2 > m.score1 ? 'text-success' : 'text-text'}`}>{m.score2}</span>
            </div>
            <span className="text-[12px] font-semibold text-text flex-1 text-right truncate">
              {m.points != null ? `${m.points} pts` : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Linked player: full profile ───────────────────────────────────────────────
const LINKED_TABS = [
  { id: 'stats',   label: 'Stats'   },
  { id: 'matches', label: 'Matches' },
]

function LinkedPlayerView({ bundle, rawLeagues: _rawLeagues, targetProfile, player, rank, navigate }) {
  const [activeTab, setActiveTab] = useState('stats')

  const achievements = useMemo(
    () => bundle ? evaluateAchievements(bundle) : [],
    [bundle]
  )

  const heroStats = useMemo(() => {
    if (!bundle) return []
    const PCT = n => `${Math.round((n || 0) * 100)}%`
    return [
      { value: String(bundle.totalMatches || 0), label: 'Matches',   colorClass: 'text-accent' },
      { value: PCT(bundle.winRate),               label: 'Win rate',  colorClass: 'text-success' },
      { value: bundle.bestRank ? `#${bundle.bestRank}` : '-', label: 'Best rank', colorClass: 'text-free' },
    ]
  }, [bundle])

  const subLine = useMemo(() => {
    const nick = targetProfile?.nickname?.trim()
    const handle = nick ? `@${nick.toLowerCase().replace(/\s+/g, '.')}` : null
    const parts = [handle, rank ? `#${rank} in league` : null].filter(Boolean)
    return parts.join(' · ') || null
  }, [targetProfile, rank])

  return (
    <div className="screen bg-bg text-text">
      {/* Header */}
      <div className="screen__top flex items-center gap-2.5 px-4 py-3 text-text bg-bg">
        <button
          onClick={() => navigate(-1)}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="text-[18px] font-bold flex-1">
          {targetProfile?.nickname || targetProfile?.full_name?.split(' ')[0] || player.displayName || player.name}
        </span>
      </div>

      <main className="screen__body">
        <div className="px-4 pb-6 pt-2">
          {/* Hero */}
          <div className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-2 bg-bg">
            <ProfileHeroCard
              profile={targetProfile}
              stats={heroStats}
              subLine={subLine}
            />
          </div>

          {/* Achievements */}
          <AchievementsSection achievements={achievements} recentlyUnlockedId={null} />

          {/* Detailed stats */}
          {bundle && (
            <PlayerStatsSection
              stats={bundle}
              onOpenDrill={null}
              onExport={null}
            />
          )}

          {/* Tabs */}
          <PillTabs
            items={LINKED_TABS}
            active={activeTab}
            onChange={setActiveTab}
            className="mb-3"
          />

          {activeTab === 'stats' && bundle && (
            <LinkedStatsTab stats={bundle} />
          )}
          {activeTab === 'matches' && bundle && (
            <MatchList matches={bundle.recentMatches || []} />
          )}
        </div>
      </main>
    </div>
  )
}

function LinkedStatsTab({ stats }) {
  const PCT = n => `${Math.round((n || 0) * 100)}%`
  const acesPerMatch = stats.totalMatches > 0
    ? ((stats.serving?.aces || 0) / stats.totalMatches).toFixed(1)
    : '-'
  const rows = [
    { l: 'Points per match', v: stats.totalMatches > 0
        ? (((stats.byTournament || []).reduce((s, t) => s + (t.points || 0), 0)) / stats.totalMatches).toFixed(1)
        : '-' },
    { l: 'Aces per match',   v: acesPerMatch },
    { l: 'Serve win %',      v: PCT(stats.serving?.serveWinPct) },
    { l: 'Side-out %',       v: PCT(stats.pressure?.sideOutPct) },
    { l: 'Best win streak',  v: stats.bestWinStreak || 0 },
    { l: 'Tournaments won',  v: stats.tournamentWins || 0 },
  ]
  return (
    <div className="bg-surface rounded-xl border border-line px-3.5">
      {rows.map((s, i) => (
        <div
          key={s.l}
          className={`flex justify-between items-center py-2 ${i < rows.length - 1 ? 'border-b border-line' : ''}`}
        >
          <span className="text-[12px] text-text">{s.l}</span>
          <span className="text-[12px] font-bold text-accent">{s.v}</span>
        </div>
      ))}
    </div>
  )
}

// ── Guest player: league-scoped view ─────────────────────────────────────────
const Svg = ({ children, size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>{children}</svg>
)
const CheckIcon = ({ size = 11 }) => <Svg size={size} className="shrink-0"><polyline points="20 6 9 17 4 12"/></Svg>

const GUEST_TABS = [
  { id: 'info',    label: 'Info'    },
  { id: 'matches', label: 'Matches' },
]

function GuestPlayerView({ player, league, rank, navigate }) {
  const [activeTab, setActiveTab] = useState('info')

  const total   = (player.wins || 0) + (player.losses || 0)
  const winRate = total > 0 ? Math.round(((player.wins || 0) / total) * 100) : null
  const gender  = GENDER_LABEL[player.sex] || '—'

  const stats = [
    { label: 'ELO',      value: player.points ?? 0 },
    { label: 'RANK',     value: `#${rank}` },
    { label: 'WINS',     value: player.wins ?? 0 },
    { label: 'WIN RATE', value: winRate !== null ? `${winRate}%` : '—' },
  ]

  const details = [
    { label: 'FULL NAME', value: player.fullName || player.name },
    { label: 'NICKNAME',  value: player.nickname || '—' },
    { label: 'GENDER',    value: gender },
    {
      label: 'LEVEL',
      value: (
        <span className="inline-block px-2.5 py-[3px] rounded-full bg-accent/15 text-accent text-[12px] font-bold">
          {levelCap(player.level)}
        </span>
      ),
    },
    { label: 'LOSSES', value: player.losses ?? 0, last: true },
  ]

  // Build match history from league data
  const recentMatches = useMemo(() => {
    const matches = []
    for (const tour of league?.tournaments || []) {
      const myTeam = tour.teams?.find(t => t.players?.includes(player.id))
      if (!myTeam) continue
      const allMatches = getAllMatches(tour).filter(m => m.played)
      for (const m of allMatches) {
        if (m.team1 !== myTeam.id && m.team2 !== myTeam.id) continue
        const myTeamId  = m.team1 === myTeam.id ? m.team1 : m.team2
        const oppTeamId = m.team1 === myTeam.id ? m.team2 : m.team1
        const oppTeam   = tour.teams?.find(t => t.id === oppTeamId)
        const oppName   = oppTeam
          ? (oppTeam.name || (oppTeam.players || []).map(pid => {
              const p = league.players?.find(pp => pp.id === pid)
              return p?.displayName || p?.name || '?'
            }).join(' & '))
          : 'Unknown'
        const date = new Date(m.created_at || m.played_at || tour.date || 0).getTime()
        matches.push({
          matchId: m.id,
          date,
          won: m.winner === myTeamId,
          score1: m.score1,
          score2: m.score2,
          opponentName: oppName,
          tournamentName: tour.name,
        })
      }
    }
    return matches.sort((a, b) => (b.date || 0) - (a.date || 0))
  }, [league, player.id])

  const label    = player.displayName || player.name || '?'

  return (
    <div className="screen bg-bg text-text">
      {/* Header */}
      <div className="screen__top flex items-center gap-2.5 px-4 py-3 text-text bg-bg">
        <button
          onClick={() => navigate(-1)}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="text-[18px] font-bold flex-1">{label}</span>
      </div>

      <main className="screen__body">
        <div className="px-4 pb-6 pt-2 flex flex-col gap-4">
          {/* Avatar + name hero */}
          <div className="flex flex-col items-center pt-2 pb-1 gap-2">
            <div className="relative" style={{ width: 72, height: 72 }}>
              <div
                className="flex items-center justify-center font-bold text-white"
                style={{ width: 72, height: 72, fontSize: 28, borderRadius: 20, backgroundColor: avatarBg(player.id || player.name) }}
              >
                {label[0].toUpperCase()}
              </div>
              {/* hollow dot = guest */}
              <span
                className="absolute rounded-full"
                style={{ right: 0, bottom: 0, width: 18, height: 18, border: '3px solid #0F1923', boxShadow: '0 0 0 1px #7A8EA0' }}
              />
            </div>
            <div className="font-display text-[28px] text-text tracking-wide text-center leading-tight">
              {label}
            </div>
            <span className="text-[11px] text-dim">Guest player · no account</span>
          </div>

          {/* Stats grid */}
          <div className="bg-surface border border-line rounded-2xl grid grid-cols-4 divide-x divide-line">
            {stats.map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center py-4 gap-0.5">
                <span className="font-display text-[22px] text-text leading-none">{value}</span>
                <span className="text-[9px] font-bold text-dim uppercase tracking-[0.6px] mt-1">{label}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <PillTabs
            items={GUEST_TABS}
            active={activeTab}
            onChange={setActiveTab}
            className="mb-0"
          />

          {activeTab === 'info' && (
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              {details.map(({ label, value, last }) => (
                <div key={label} className={`flex items-center min-h-[44px] px-3.5 py-3 ${!last ? 'border-b border-line' : ''}`}>
                  <span className="w-24 text-[11px] font-bold text-dim uppercase tracking-[0.6px] flex-shrink-0">{label}</span>
                  <span className="flex-1 text-[13px] text-text text-right">{value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'matches' && (
            <MatchList matches={recentMatches} />
          )}
        </div>
      </main>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlayerProfile() {
  const { id, pid }    = useParams()
  const navigate       = useNavigate()
  const { league, loading: leagueLoading } = useLeague(id)
  const { isAdmin, loading: roleLoading }  = useLeagueRole(id)

  const player = useMemo(
    () => league?.players?.find(p => p.id === pid) || null,
    [league, pid]
  )

  // Always call — hook handles null userId gracefully
  const { loading: statsLoading, bundle, rawLeagues, targetProfile } =
    usePlayerStatsForUser(player?.userId || null)

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate(`/league/${id}`, { replace: true })
  }, [isAdmin, roleLoading, id, navigate])

  const rank = useMemo(() => {
    if (!league?.players) return 0
    const sorted = [...league.players].sort((a, b) => (b.points || 0) - (a.points || 0))
    return sorted.findIndex(p => p.id === pid) + 1
  }, [league, pid])

  const isLinked = !!player?.userId
  const loading  = leagueLoading || roleLoading || (isLinked && statsLoading)

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-line border-t-accent animate-spin" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3 p-6">
        <div className="text-[15px] font-semibold text-text">Player not found</div>
        <button
          onClick={() => navigate(-1)}
          className="text-[13px] text-accent font-semibold border-0 bg-transparent cursor-pointer"
        >
          Go back
        </button>
      </div>
    )
  }

  if (isLinked) {
    return (
      <LinkedPlayerView
        player={player}
        rank={rank}
        bundle={bundle}
        rawLeagues={rawLeagues}
        targetProfile={targetProfile}
        navigate={navigate}
      />
    )
  }

  return (
    <GuestPlayerView
      player={player}
      league={league}
      rank={rank}
      navigate={navigate}
    />
  )
}
