import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PillTabs } from '../components/ui-new'
import ProfileHeroCard from '../components/profile/ProfileHeroCard'
import AchievementsSection from '../components/profile/AchievementsSection'
import PlayerStatsSection from '../components/profile/PlayerStatsSection'
import { evaluateAchievements } from '../lib/achievements'
import { computeAllPlayerStats } from '../lib/playerStats'
import { resolveScoringLevel } from '../lib/scoring'
import { calcOverallStandings } from '../lib/standings'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { usePlayerStatsForUser } from '../hooks/usePlayerStatsForUser'
import { buildCoachExport } from '../lib/playerStatsExport'
import { useToast } from '../contexts/ToastContext'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAllMatches(tour) {
  return [
    ...((tour.groups  || []).flatMap(g => g.matches || [])),
    ...((tour.knockout?.rounds || []).flatMap(r => r.matches || [])),
    ...(tour.matches || []),
  ]
}

function formatShortDate(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Recent matches list (shared) ──────────────────────────────────────────────
function MatchList({ matches }) {
  if (!matches.length) {
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

// ── Performance summary tab ───────────────────────────────────────────────────
function StatsTab({ stats }) {
  const PCT = n => `${Math.round((n || 0) * 100)}%`
  const l2 = stats.perMatchAverages
  const l3 = stats.serving
  const rows = [
    { l: 'Points per match', v: (l2?.sampleSize || 0) > 0
        ? (l2?.value?.pointsPerMatch || 0).toFixed(1)
        : '-' },
    { l: 'Aces per match',  v: (l3?.sampleSize || 0) > 0 ? ((l3?.value?.aces || 0) / l3.sampleSize).toFixed(1) : '-' },
    { l: 'Serve win %',     v: PCT(stats.serving?.value?.serveWinPct) },
    { l: 'Side-out %',      v: PCT(stats.pressure?.value?.sideOutPct) },
    { l: 'Best win streak', v: stats.bestWinStreak?.value || 0 },
    { l: 'Tournaments won', v: stats.tournamentWins || 0 },
  ]
  return (
    <div className="bg-surface rounded-xl border border-line px-3.5">
      {rows.map((s, i) => (
        <div key={s.l} className={`flex justify-between items-center py-2 ${i < rows.length - 1 ? 'border-b border-line' : ''}`}>
          <span className="text-[12px] text-text">{s.l}</span>
          <span className="text-[12px] font-bold text-accent">{s.v}</span>
        </div>
      ))}
    </div>
  )
}

// ── Full profile view (used for both linked and guest players) ─────────────────
const PROFILE_TABS = [
  { id: 'stats',   label: 'Stats'   },
  { id: 'matches', label: 'Matches' },
]

function FullProfileView({ profile, bundle, rank, player, navigate }) {
  const [activeTab, setActiveTab] = useState('stats')
  const { addToast } = useToast()

  const achievements = useMemo(
    () => bundle ? evaluateAchievements(bundle) : [],
    [bundle]
  )

  const heroStats = useMemo(() => {
    if (!bundle) return []
    const PCT = n => `${Math.round((n || 0) * 100)}%`
    return [
      { value: String(bundle.totalMatches || 0),                          label: 'Matches',   colorClass: 'text-accent'  },
      { value: PCT(bundle.winRate?.value),                                 label: 'Win rate',  colorClass: 'text-success' },
      { value: bundle.bestRank ? `#${bundle.bestRank}` : '-',             label: 'Best rank', colorClass: 'text-free'    },
    ]
  }, [bundle])

  const subLine = useMemo(() => {
    const nick   = profile?.nickname?.trim()
    const handle = nick ? `@${nick.toLowerCase().replace(/\s+/g, '.')}` : null
    const parts  = [handle, rank ? `#${rank} in league` : null].filter(Boolean)
    return parts.join(' · ') || null
  }, [profile, rank])

  const displayName = profile?.nickname?.trim() || profile?.full_name?.split(' ')[0] || player.displayName || player.name

  async function handleExport() {
    if (!bundle || !profile) return
    const text = buildCoachExport(profile, bundle, bundle.recentMatches || [])
    try {
      await navigator.clipboard.writeText(text)
      addToast({
        id: `copy-${Date.now()}`,
        variant: 'success',
        title: 'Copied to clipboard',
        body: 'Paste into ChatGPT or Claude with a coaching prompt.',
      })
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

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
        <span className="text-[18px] font-bold flex-1">{displayName}</span>
      </div>

      <main className="screen__body">
        <div className="px-4 pb-6 pt-2">

          {/* Sticky hero */}
          <div className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-2 bg-bg">
            <ProfileHeroCard
              profile={profile}
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
              onExport={handleExport}
            />
          )}

          {/* Tabs */}
          <PillTabs
            items={PROFILE_TABS}
            active={activeTab}
            onChange={setActiveTab}
            className="mb-3"
          />

          {activeTab === 'stats'   && bundle && <StatsTab stats={bundle} />}
          {activeTab === 'matches' && bundle && <MatchList matches={bundle.recentMatches || []} />}

        </div>
      </main>
    </div>
  )
}

// ── Build stats bundle from a single league (for guest players) ───────────────
function buildLeagueBundle(league, player) {
  const annotated     = []
  const tournamentWins = new Set()
  const recentMatches = []

  for (const tour of league.tournaments || []) {
    const level = resolveScoringLevel(tour, league)
    const myTeam = tour.teams?.find(t => t.players?.includes(player.id))
    if (!myTeam) continue

    const allPlayed = getAllMatches(tour).filter(m => m.played)

    // Finish rank within this tournament
    let finishRank = null
    if (allPlayed.length > 0) {
      try {
        const standings = calcOverallStandings(tour.teams || [], allPlayed)
        const idx = standings.findIndex(s => s.id === myTeam.id)
        finishRank = idx >= 0 ? idx + 1 : null
      } catch { /* ignore */ }
    }
    if (finishRank === 1) tournamentWins.add(tour.id)

    const tDate = new Date(tour.date || tour.created_at || 0).getTime()

    for (const m of allPlayed) {
      if (m.team1 !== myTeam.id && m.team2 !== myTeam.id) continue

      const playerTeamId   = m.team1 === myTeam.id ? m.team1 : m.team2
      const opposingTeamId = m.team1 === myTeam.id ? m.team2 : m.team1
      const date = (() => {
        const d = new Date(m.created_at || m.played_at || 0)
        return Number.isNaN(d.getTime()) ? tDate : d.getTime()
      })()

      const oppTeam = tour.teams?.find(t => t.id === opposingTeamId)
      const oppName = oppTeam
        ? (oppTeam.name || (oppTeam.players || []).map(pid => {
            const p = league.players?.find(pp => pp.id === pid)
            return p?.displayName || p?.name || '?'
          }).join(' & '))
        : 'Unknown'

      annotated.push({
        match: m,
        pid: player.id,
        playerTeamNum:  m.team1 === myTeam.id ? 1 : 2,
        playerTeamId,
        opposingTeamId,
        tournamentId:   tour.id,
        tournamentName: tour.name,
        leagueId:       league.id,
        leagueName:     league.name,
        date,
        finishRank,
        level,
      })

      recentMatches.push({
        matchId:        m.id,
        date,
        won:            m.winner === playerTeamId,
        score1:         m.score1,
        score2:         m.score2,
        opponentName:   oppName,
        tournamentName: tour.name,
        leagueName:     league.name,
        leagueId:       league.id,
        tournamentId:   tour.id,
      })
    }
  }

  const stats = computeAllPlayerStats(annotated)
  stats.leagueCount     = 1
  stats.tournamentWins  = tournamentWins.size
  stats.uniquePartners  = 0
  stats.uniqueOpponents = 0

  let bestRankNum = Infinity
  for (const t of stats.byTournament) {
    if (t.finishRank && t.finishRank < bestRankNum) bestRankNum = t.finishRank
  }
  stats.bestRank = Number.isFinite(bestRankNum) ? bestRankNum : null

  // Per-match point/ace tally
  const matchScoring = new Map()
  for (const a of annotated) {
    let pts = 0; let aces = 0
    for (const e of a.match.log || []) {
      if (e.scoringPlayerId === a.pid) { pts++; if (e.pointType === 'ace') aces++ }
    }
    matchScoring.set(a.match.id, { points: pts, aces })
  }
  for (const r of recentMatches) {
    const ms = matchScoring.get(r.matchId)
    if (ms) { r.points = ms.points; r.aces = ms.aces }
  }
  recentMatches.sort((a, b) => (b.date || 0) - (a.date || 0))
  stats.recentMatches = recentMatches

  return stats
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

  // For linked players — returns { loading, bundle, rawLeagues, targetProfile }
  // Handles null userId gracefully (returns loading:false immediately)
  const { loading: statsLoading, bundle: linkedBundle, targetProfile } =
    usePlayerStatsForUser(player?.userId || null)

  // For guest players — compute bundle from this league's data
  const guestBundle = useMemo(() => {
    if (!league || !player || player.userId) return null
    return buildLeagueBundle(league, player)
  }, [league, player])

  // Synthetic profile object for guest players
  const guestProfile = useMemo(() => {
    if (!player || player.userId) return null
    return {
      id:         player.id,
      full_name:  player.fullName || player.name,
      nickname:   player.nickname  || null,
      avatar_url: null,
      country:    player.country   || null,
      gender:     player.sex       || null,
    }
  }, [player])

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

  return (
    <FullProfileView
      profile={isLinked ? targetProfile : guestProfile}
      bundle={isLinked ? linkedBundle : guestBundle}
      rank={rank}
      player={player}
      navigate={navigate}
    />
  )
}
