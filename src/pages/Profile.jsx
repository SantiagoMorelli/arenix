import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, ChevronLeft } from 'lucide-react'
import { SectionLabel, AppToast, PillTabs } from '../components/ui-new'
import { useAuth } from '../contexts/AuthContext'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { useAchievementUnlocks } from '../hooks/useAchievementUnlocks'
import { evaluateAchievements } from '../lib/achievements'
import { playUnlockChime } from '../lib/chime'
import { buildCoachExport } from '../lib/playerStatsExport'

import ProfileHeroCard from '../components/profile/ProfileHeroCard'
import AchievementsSection from '../components/profile/AchievementsSection'
import PlayerStatsSection from '../components/profile/PlayerStatsSection'
import TournamentDrillSheet from '../components/profile/sheets/TournamentDrillSheet'
import MatchDrillSheet from '../components/profile/sheets/MatchDrillSheet'
import PointDrillSheet from '../components/profile/sheets/PointDrillSheet'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatShortDate(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const PROFILE_TABS = [
  { id: 'stats',   label: 'Stats'   },
  { id: 'leagues', label: 'Leagues' },
  { id: 'matches', label: 'Matches' },
]

// ─── Stats tab (slim summary) ─────────────────────────────────────────────────
function StatsTab({ stats }) {
  const PCT = (n) => `${Math.round((n || 0) * 100)}%`
  const acesPerMatch = stats.totalMatches > 0
    ? ((stats.serving?.aces || 0) / stats.totalMatches).toFixed(1)
    : '-'
  const pointsPerMatch = stats.totalMatches > 0
    ? (((stats.byTournament || []).reduce((s, t) => s + (t.points || 0), 0)) / stats.totalMatches).toFixed(1)
    : '-'
  const rows = [
    { l: 'Points per match', v: pointsPerMatch },
    { l: 'Aces per match',   v: acesPerMatch },
    { l: 'Serve win %',      v: PCT(stats.serving?.serveWinPct) },
    { l: 'Side-out %',       v: PCT(stats.pressure?.sideOutPct) },
    { l: 'Best win streak',  v: stats.bestWinStreak || 0 },
    { l: 'Tournaments won',  v: stats.tournamentWins || 0 },
  ]
  return (
    <div>
      <SectionLabel color="dim">Performance</SectionLabel>
      <div className="bg-surface rounded-xl border border-line px-3.5 mb-2">
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
    </div>
  )
}

// ─── Leagues tab ──────────────────────────────────────────────────────────────
function LeaguesTab({ leagues, navigate, profile }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel color="accent">My Leagues</SectionLabel>

      {leagues.length === 0 && (
        <div className="text-center text-[13px] text-dim py-8 border border-dashed border-line rounded-xl">
          You are not in any leagues yet.
        </div>
      )}

      {leagues.map((lg) => {
        const myPlayer = lg.players?.find(p => p.userId === profile?.id)
        const sorted = [...(lg.players || [])].sort((a, b) => (b.points || 0) - (a.points || 0))
        const myRank = myPlayer ? sorted.findIndex(p => p.id === myPlayer.id) + 1 : 0
        const role = lg.members?.find(m => m.userId === profile?.id)?.roles?.includes('admin') ? 'admin' : 'player'
        const wins = myPlayer?.wins || 0
        const losses = myPlayer?.losses || 0

        return (
          <div
            key={lg.id}
            onClick={() => navigate(`/league/${lg.id}`)}
            className="bg-surface rounded-xl px-3.5 py-3 border border-line cursor-pointer active:opacity-80 transition-opacity"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-[14px] font-bold text-text truncate">{lg.name}</div>
                <div className="text-[11px] text-dim">
                  Season {lg.season} · {lg.players?.length || 0} players
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {myRank > 0 && (
                  <span className="text-[9px] font-bold text-accent bg-accent/15 px-2 py-[3px] rounded-md">
                    #{myRank}
                  </span>
                )}
                {role === 'admin' && (
                  <span className="text-[9px] font-bold text-free bg-free/15 px-2 py-[3px] rounded-md">
                    Admin
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { n: wins,   l: 'Wins'   },
                { n: losses, l: 'Losses' },
                { n: lg.tournaments?.length || 0, l: 'Tournaments' },
              ].map(s => (
                <div key={s.l} className="flex-1 bg-bg rounded-lg py-1.5 px-1 text-center">
                  <div className="text-[13px] font-bold text-text">{s.n}</div>
                  <div className="text-[8px] text-dim">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div
        onClick={() => navigate('/')}
        className="border border-dashed border-accent/50 rounded-xl py-3.5 text-center text-[12px] font-semibold text-accent cursor-pointer mt-1 active:opacity-80 transition-opacity"
      >
        + Join a League
      </div>
    </div>
  )
}

// ─── Matches tab ──────────────────────────────────────────────────────────────
function MatchesTab({ matches }) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel color="dim">Recent Matches</SectionLabel>

      {matches.length === 0 && (
        <div className="text-center text-[13px] text-dim py-8 border border-dashed border-line rounded-xl">
          No matches played yet.
        </div>
      )}

      {matches.slice(0, 30).map((m) => (
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

// ─── Profile page ─────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('stats')
  const [toast, setToast] = useState(null)
  const [recentlyUnlockedId, setRecentlyUnlockedId] = useState(null)

  // Drill-down sheet stack
  const [drillTournament, setDrillTournament] = useState(null)
  const [drillAnnotatedMatch, setDrillAnnotatedMatch] = useState(null)
  const [tournamentSheetOpen, setTournamentSheetOpen] = useState(false)

  const { loading, bundle, rawLeagues } = usePlayerStats(profile)

  const evaluated = useMemo(
    () => bundle ? evaluateAchievements(bundle) : [],
    [bundle]
  )

  // Achievement unlock side effects (toast + chime + pop animation).
  useAchievementUnlocks(evaluated, (achievement) => {
    setRecentlyUnlockedId(achievement.id)
    playUnlockChime()
    setToast({
      id: `unlock-${achievement.id}-${Date.now()}`,
      variant: 'success',
      title: 'Achievement unlocked',
      body: achievement.name,
    })
    // Clear the pop-animation flag so it doesn't replay forever.
    setTimeout(() => setRecentlyUnlockedId((cur) => (cur === achievement.id ? null : cur)), 800)
  })

  // ── Hero subline ──
  const nickname = profile?.nickname?.trim() || ''
  const handle = nickname ? `@${nickname.toLowerCase().replace(/\s+/g, '.')}` : null
  const firstLeague = rawLeagues[0]?.name || null
  const subLine = [handle, firstLeague].filter(Boolean).join(' · ') || null

  // ── Hero stats ──
  const heroStats = useMemo(() => {
    if (!bundle) return []
    const PCT = (n) => `${Math.round((n || 0) * 100)}%`
    return [
      { value: String(bundle.totalMatches || 0), label: 'Matches', colorClass: 'text-accent' },
      { value: PCT(bundle.winRate), label: 'Win rate', colorClass: 'text-success' },
      { value: bundle.bestRank ? `#${bundle.bestRank}` : '-', label: 'Best rank', colorClass: 'text-free' },
    ]
  }, [bundle])

  async function handleExport() {
    if (!bundle || !profile) return
    const text = buildCoachExport(profile, bundle, bundle.recentMatches || [])
    try {
      await navigator.clipboard.writeText(text)
      setToast({
        id: `copy-${Date.now()}`,
        variant: 'success',
        title: 'Copied to clipboard',
        body: 'Paste into ChatGPT or Claude with a coaching prompt.',
      })
    } catch {
      setToast({
        id: `copy-err-${Date.now()}`,
        variant: 'error',
        title: 'Could not copy',
        body: 'Try selecting the text manually.',
      })
    }
  }

  // ── Drill-down handlers ──
  function openTournamentDrill() {
    setDrillTournament(null)
    setDrillAnnotatedMatch(null)
    setTournamentSheetOpen(true)
  }
  function selectTournament(t) { setDrillTournament(t) }
  function selectMatch(annotatedMatch) { setDrillAnnotatedMatch(annotatedMatch) }
  function closePoint() { setDrillAnnotatedMatch(null) }
  function closeMatch() { setDrillTournament(null) }
  function closeTournaments() {
    setTournamentSheetOpen(false)
    setDrillTournament(null)
    setDrillAnnotatedMatch(null)
  }

  // Resolve raw tournament for the drill sheets (player names, opponent names).
  const drillRawTournament = useMemo(() => {
    if (!drillTournament) return null
    const lg = rawLeagues.find(l => l.id === drillTournament.leagueId)
    if (!lg) return null
    const tour = lg.tournaments?.find(t => t.id === drillTournament.tournamentId)
    if (!tour) return null
    return { ...tour, players: lg.players }
  }, [drillTournament, rawLeagues])

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-bg text-text items-center justify-center">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="screen bg-bg text-text">

      {/* Header */}
      <div className="screen__top flex items-center gap-2.5 px-4 py-3 text-text bg-bg">
        <button
          onClick={() => navigate('/')}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="text-[18px] font-bold flex-1">Profile</span>
        <button
          onClick={() => navigate('/settings')}
          className="cursor-pointer bg-transparent border-0 p-1 text-dim"
          aria-label="Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </div>

      {/* Toast (in-flow at the top) */}
      <AppToast toast={toast} onDismiss={() => setToast(null)} />

      {/* Scrollable content */}
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
          <AchievementsSection
            achievements={evaluated}
            recentlyUnlockedId={recentlyUnlockedId}
          />

          {/* Player Stats — headline section */}
          {bundle && (
            <PlayerStatsSection
              stats={bundle}
              onOpenDrill={openTournamentDrill}
              onExport={handleExport}
            />
          )}

          {/* Existing tabs */}
          <PillTabs
            items={PROFILE_TABS}
            active={activeTab}
            onChange={setActiveTab}
            className="mb-3"
          />

          {bundle && activeTab === 'stats'   && <StatsTab stats={bundle} />}
          {activeTab === 'leagues' && <LeaguesTab leagues={rawLeagues} navigate={navigate} profile={profile} />}
          {bundle && activeTab === 'matches' && <MatchesTab matches={bundle.recentMatches || []} />}

        </div>
      </main>

      {/* Drill-down sheets */}
      <TournamentDrillSheet
        open={tournamentSheetOpen && !drillTournament}
        onClose={closeTournaments}
        tournaments={bundle?.byTournament || []}
        onSelect={selectTournament}
      />

      <MatchDrillSheet
        open={!!drillTournament && !drillAnnotatedMatch}
        onClose={closeMatch}
        tournament={drillTournament}
        rawTournament={drillRawTournament}
        onSelect={selectMatch}
      />

      <PointDrillSheet
        open={!!drillAnnotatedMatch}
        onClose={closePoint}
        annotated={drillAnnotatedMatch}
        rawTournament={drillRawTournament}
        leaguePlayers={drillRawTournament?.players}
      />

    </div>
  )
}
