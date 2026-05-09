import { useMemo, useState } from 'react'
import {
  ChevronLeft, Trophy, Medal, Target, Zap, Shield, Bomb, Hand, Send,
  Dumbbell, Flame, RotateCcw, Clock, Volleyball, ChevronRight, Clipboard,
} from 'lucide-react'
import { formatDuration, getMatchDuration, getLongestRally } from '../lib/utils'
import { calcOverallStandings } from '../lib/standings'
import { getAllMatches } from '../lib/tournament'
import { resolveScoringLevel } from '../lib/scoring'
import { computePlayerStats, rankPlayersByStat, TOURNAMENT_RANKING_MIN_LEVELS } from '../lib/tournamentStats'
import { AppBadge, AppCard, SectionLabel } from './ui-new'
import TieBreakerControls from './standings/TieBreakerControls'
import AwardRankingSheet from './stats/AwardRankingSheet'
import MatchBreakdownSheet from './stats/MatchBreakdownSheet'
import TeamDetailSheet from './stats/TeamDetailSheet'
import PlayerTournamentDetailSheet from './stats/PlayerTournamentDetailSheet'
import { useToast } from './ToastContext'
import { buildTournamentCoachExport } from '../lib/tournamentStatsExport'

// ─── Awards configuration ────────────────────────────────────────────────────
// Add a new award by appending an entry. `gateKey` + `minThreshold` filter out
// players that don't meet the qualifier (e.g. "Most Efficient Server" needs
// at least 10 serves before its win-rate is meaningful).
const TOURNAMENT_AWARDS = [
  { id: 'top-scorer',      title: 'Top Scorer',          Icon: Trophy, statKey: 'points',      valueLabel: 'pts'    },
  { id: 'ace-king',        title: 'Ace King',            Icon: Target, statKey: 'aces',        valueLabel: 'aces'   },
  { id: 'spike-machine',   title: 'Spike Machine',       Icon: Zap,    statKey: 'spikes',      valueLabel: 'spikes' },
  { id: 'block-master',    title: 'Block Master',        Icon: Shield, statKey: 'blocks',      valueLabel: 'blocks' },
  { id: 'tip-master',      title: 'Tip Master',          Icon: Hand,   statKey: 'tips',        valueLabel: 'tips'   },
  { id: 'efficient-server',title: 'Most Efficient Server', Icon: Send, statKey: 'serveWinPct', valueLabel: '%',
    minThreshold: 10, gateKey: 'serves', secondaryKey: 'serves', secondaryLabel: 'serves' },
  { id: 'glass-cannon',    title: 'Glass Cannon',        Icon: Bomb,   statKey: 'errors',      valueLabel: 'errors', funny: true },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeMatchRecords(allMatches) {
  const played = allMatches.filter(m => m.played && m.team1 && m.team2)
  if (!played.length) return null

  let mostDominant = null, dominance = -1
  let highestScoring = null, highScore = -1
  let longestStreak = null, streak = 0
  let biggestComeback = null, maxComeback = 0

  for (const m of played) {
    const diff  = Math.abs(m.score1 - m.score2)
    const total = m.score1 + m.score2

    if (diff > dominance) { dominance = diff; mostDominant = m }
    if (total > highScore) { highScore = total; highestScoring = m }

    if (m.log?.length) {
      for (const entry of m.log) {
        if ((entry.streak || 0) > streak) { streak = entry.streak; longestStreak = { match: m, streak: entry.streak, team: entry.team } }
      }

      // Biggest comeback: per set, track max deficit overcome by winner
      const setNums = [...new Set(m.log.map(e => e.setNum))]
      for (const sn of setNums) {
        const entries = m.log.filter(e => e.setNum === sn).sort((a, b) => a.pointNum - b.pointNum)
        if (!entries.length) continue
        const last = entries[entries.length - 1]
        const setWinner = last.t1 > last.t2 ? 1 : 2

        let maxDeficit = 0
        for (const e of entries) {
          const deficit = setWinner === 1 ? e.t2 - e.t1 : e.t1 - e.t2
          if (deficit > maxDeficit) maxDeficit = deficit
        }
        if (maxDeficit > maxComeback) {
          maxComeback = maxDeficit
          biggestComeback = { match: m, team: setWinner === 1 ? m.team1 : m.team2, deficit: maxDeficit }
        }
      }
    }
  }

  let longestGame = null, longestGameDuration = 0
  let longestRallyRecord = null, longestRallyDuration = 0

  for (const m of played) {
    if (!m.log?.length) continue

    const dur = getMatchDuration(m.log)
    if (dur != null && dur > longestGameDuration) {
      longestGameDuration = dur
      longestGame = { match: m, duration: dur }
    }

    const rally = getLongestRally(m.log)
    if (rally != null && rally > longestRallyDuration) {
      longestRallyDuration = rally
      longestRallyRecord = { match: m, duration: rally }
    }
  }

  return { mostDominant, dominance, highestScoring, highScore, longestStreak, biggestComeback, longestGame, longestRally: longestRallyRecord }
}

// ─── Medal tint per podium rank ───────────────────────────────────────────────
const MEDAL_COLOR = {
  1: 'text-accent',
  2: 'text-dim',
  3: 'text-[#CD7F32]',
}

function Podium({ tournament, leaguePlayers }) {
  const { winnerTeamId, knockout, teams } = tournament

  const finalRound = knockout?.rounds?.find(r => r.id === 'final')
  const finalMatch = finalRound?.matches?.[0]

  const thirdRound = knockout?.rounds?.find(r => r.id === 'third_place')
  const thirdMatch = thirdRound?.matches?.[0]

  const runnerUpId = finalMatch?.played
    ? (finalMatch.team1 === winnerTeamId ? finalMatch.team2 : finalMatch.team1)
    : null

  const thirdId = thirdMatch?.played ? thirdMatch.winner : null

  const getTeam = id => teams.find(t => t.id === id)
  const getNames = id => {
    const t = getTeam(id)
    return (t?.players || []).map(pid => {
      const p = leaguePlayers.find(x => x.id === pid)
      return p ? (p.displayName || p.nickname || p.name) : '?'
    }).join(' & ')
  }

  const champion = getTeam(winnerTeamId)

  const slots = [
    runnerUpId ? { rank: 2, id: runnerUpId, height: 'h-16', label: 'Runner-up' } : null,
    { rank: 1, id: winnerTeamId, height: 'h-24', label: 'Champion' },
    thirdId ? { rank: 3, id: thirdId, height: 'h-10', label: '3rd Place' } : null,
  ].filter(Boolean)

  return (
    <div className="px-4">
      {/* Champion highlight */}
      <div className="bg-gradient-to-br from-accent/15 to-surface border border-accent/40 rounded-[14px] p-5 mb-4 text-center">
        <div className="flex justify-center mb-1.5">
          <Trophy size={36} className="text-accent" />
        </div>
        <div className="font-display text-[28px] text-accent leading-none mb-1">{champion?.name || '?'}</div>
        <div className="text-[13px] text-dim mt-1">{getNames(winnerTeamId)}</div>
        <div className="text-[11px] font-bold text-accent/60 uppercase tracking-[0.5px] mt-2">Champion</div>
      </div>

      {/* Podium visual */}
      {slots.length > 1 && (
        <div className="flex items-end justify-center gap-3 mb-2">
          {slots.map(slot => (
            <div key={slot.id} className="flex flex-col items-center flex-1 max-w-[110px]">
              <Medal size={22} className={`mb-1 ${MEDAL_COLOR[slot.rank]}`} />
              <div className="text-[12px] font-bold text-text text-center leading-tight mb-1.5 px-1">
                {getTeam(slot.id)?.name || '?'}
              </div>
              <div className="text-[10px] text-dim text-center mb-1.5 px-1 leading-tight">
                {getNames(slot.id)}
              </div>
              <div className={`w-full ${slot.height} rounded-t-lg flex items-center justify-center ${
                slot.rank === 1 ? 'bg-accent/30 border-t-2 border-accent' :
                slot.rank === 2 ? 'bg-surface border-t border-line' :
                'bg-alt border-t border-line'
              }`}>
                <span className={`font-display text-[18px] leading-none ${slot.rank === 1 ? 'text-accent' : 'text-dim'}`}>
                  #{slot.rank}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AwardCard(props) {
  const { Icon, title, playerName, value, valueLabel, funny = false, onClick } = props
  const accentText = funny ? 'text-error' : 'text-accent'
  return (
    <AppCard
      className={`rounded-2xl p-4 flex flex-col gap-1.5 cursor-pointer active:opacity-80 transition-opacity ${
        funny ? 'bg-error/10 border-error/30' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <Icon size={22} className={accentText} />
        <ChevronRight size={14} className="text-dim" />
      </div>
      <div className={`text-[10px] font-bold uppercase tracking-[0.5px] ${accentText}`}>
        {title}
      </div>
      <div className="text-[14px] font-bold text-text leading-tight">{playerName}</div>
      <div className={`text-[12px] font-semibold ${funny ? 'text-error/70' : 'text-dim'}`}>
        {value} {valueLabel}
      </div>
    </AppCard>
  )
}

function Awards({ playerStats, leaguePlayers, scoringLevel, onSelectAward }) {
  const cards = TOURNAMENT_AWARDS.map(award => {
    const minLevel = TOURNAMENT_RANKING_MIN_LEVELS[award.statKey] ?? 3
    if (scoringLevel < minLevel) return null
    const ranked = rankPlayersByStat(playerStats, award.statKey, {
      leaguePlayers,
      minThreshold: award.minThreshold || 0,
      gateKey: award.gateKey,
      secondaryKey: award.secondaryKey,
    })
    if (!ranked.length) return null
    const winner = ranked[0]
    return { award, winner, ranked }
  }).filter(Boolean)

  if (!cards.length) {
      return (
        <div className="px-4 text-[13px] text-dim text-center py-4">
          No live match stats recorded
        </div>
      )
  }

  return (
    <div className="px-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ award, winner, ranked }) => (
          <AwardCard
            key={award.id}
            Icon={award.Icon}
            title={award.title}
            playerName={winner.name}
            value={winner.value}
            valueLabel={award.valueLabel}
            funny={!!award.funny}
            onClick={() => onSelectAward({ award, ranked })}
          />
        ))}
      </div>
      <div className="text-[11px] text-dim text-center mt-3">
        Tap an award to see the full ranking
      </div>
    </div>
  )
}

function StandingsSection({ tournament, leaguePlayers, tbOptions, isAdmin = false, onSelectTeam }) {
  const allMatches = getAllMatches(tournament)
  const rows = calcOverallStandings(tournament.teams, allMatches, leaguePlayers, tbOptions)

  return (
    <div className="px-4">
      <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
        <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt justify-between">
          <div className="flex items-center gap-2">
            <span className="w-[20px] text-[10px] font-bold text-dim">#</span>
            <span className="text-[10px] font-bold text-dim">TEAM</span>
          </div>
          <div className="flex items-center">
            {isAdmin && tbOptions?.tieBreakerMode !== 'id' && (
              <span className="mr-3 text-[10px] font-bold text-dim uppercase">TB: {tbOptions?.tieBreakerMode}</span>
            )}
            <span className="w-6 text-center text-[10px] font-bold text-dim">W</span>
            <span className="w-6 text-center text-[10px] font-bold text-dim">L</span>
            <span className="w-7 text-center text-[10px] font-bold text-dim">PF</span>
            <span className="w-7 text-center text-[10px] font-bold text-dim">PA</span>
            <span className="w-7 text-center text-[10px] font-bold text-dim">PD</span>
            <span className="w-8 text-center text-[10px] font-bold text-dim">PTS</span>
          </div>
        </div>
        {rows.map((row, i) => {
          const team = tournament.teams.find(t => t.id === row.id)
          return (
            <button
              key={row.id}
              onClick={() => team && onSelectTeam(team)}
              className={`w-full flex items-center px-3.5 py-2.5 text-left bg-transparent border-0 cursor-pointer active:bg-alt/50 transition-colors ${i < rows.length - 1 ? 'border-b border-line' : ''} ${i === 0 ? 'bg-accent/15' : ''}`}
            >
              <span className={`w-[20px] text-[13px] font-bold ${i === 0 ? 'text-accent' : 'text-dim'}`}>{i + 1}</span>
              <div className="flex-1 overflow-hidden pr-2">
                <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
                {row.playerNames && <div className="text-[10px] text-dim mt-0.5 truncate">{row.playerNames}</div>}
              </div>
              <span className="w-6 text-center text-[13px] font-semibold text-success flex-shrink-0">{row.wins}</span>
              <span className="w-6 text-center text-[13px] font-semibold text-error flex-shrink-0">{row.losses}</span>
              <span className="w-7 text-center text-[13px] font-semibold text-text flex-shrink-0">{row.pf}</span>
              <span className="w-7 text-center text-[13px] font-semibold text-text flex-shrink-0">{row.pa}</span>
              <span className={`w-7 text-center text-[13px] font-semibold flex-shrink-0 ${row.pd > 0 ? 'text-success' : row.pd < 0 ? 'text-error' : 'text-text'}`}>
                {row.pd > 0 ? '+' + row.pd : row.pd}
              </span>
              <span className="w-8 text-center text-[13px] font-bold text-accent flex-shrink-0">{row.pts}</span>
            </button>
          )
        })}
      </div>
      <div className="text-[11px] text-dim text-center mt-3">
        Tap a team to see player stats
      </div>
    </div>
  )
}

function RecordCard(props) {
  const { Icon, title, line1, line2, onClick } = props
  if (!line1) return null
  return (
    <AppCard
      className="rounded-2xl p-4 cursor-pointer active:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <Icon size={20} className="text-accent" />
        <ChevronRight size={14} className="text-dim" />
      </div>
      <div className="text-[10px] font-bold text-accent uppercase tracking-[0.5px] mb-1">{title}</div>
      <div className="text-[13px] font-bold text-text leading-snug">{line1}</div>
      {line2 && <div className="text-[11px] text-dim mt-0.5">{line2}</div>}
    </AppCard>
  )
}

function MatchRecords({ records, tournament, onSelectRecord }) {
  if (!records) return <div className="px-4 text-[13px] text-dim text-center py-4">No matches played yet</div>

  const tName = id => tournament.teams.find(t => t.id === id)?.name || '?'

  const { mostDominant, dominance, highestScoring, highScore, longestStreak, biggestComeback, longestGame, longestRally } = records

  return (
    <div className="px-4 grid grid-cols-2 gap-3">
      <RecordCard
        Icon={Dumbbell}
        title="Most Dominant"
        line1={mostDominant ? `${tName(mostDominant.winner)} wins` : null}
        line2={mostDominant ? `${mostDominant.score1}–${mostDominant.score2} (${dominance} pt gap)` : null}
        onClick={mostDominant ? () => onSelectRecord({ match: mostDominant, title: 'Most Dominant' }) : undefined}
      />
      <RecordCard
        Icon={Flame}
        title="Highest Scoring"
        line1={highestScoring ? `${tName(highestScoring.team1)} vs ${tName(highestScoring.team2)}` : null}
        line2={highestScoring ? `${highestScoring.score1}–${highestScoring.score2} (${highScore} total pts)` : null}
        onClick={highestScoring ? () => onSelectRecord({ match: highestScoring, title: 'Highest Scoring' }) : undefined}
      />
      {longestStreak && (
        <RecordCard
          Icon={Zap}
          title="Longest Streak"
          line1={`${longestStreak.streak} in a row`}
          line2={`${tName(longestStreak.team === 1 ? longestStreak.match.team1 : longestStreak.match.team2)} · ${longestStreak.match.label}`}
          onClick={() => onSelectRecord({ match: longestStreak.match, title: 'Longest Streak' })}
        />
      )}
      {biggestComeback && (
        <RecordCard
          Icon={RotateCcw}
          title="Best Comeback"
          line1={`${tName(biggestComeback.team)} came back`}
          line2={`Down ${biggestComeback.deficit} pts · ${biggestComeback.match.label}`}
          onClick={() => onSelectRecord({ match: biggestComeback.match, title: 'Best Comeback' })}
        />
      )}
      {longestGame && (
        <RecordCard
          Icon={Clock}
          title="Longest Game"
          line1={`${tName(longestGame.match.team1)} vs ${tName(longestGame.match.team2)}`}
          line2={`${formatDuration(longestGame.duration)} · ${longestGame.match.label}`}
          onClick={() => onSelectRecord({ match: longestGame.match, title: 'Longest Game' })}
        />
      )}
      {longestRally && (
        <RecordCard
          Icon={Volleyball}
          title="Longest Rally"
          line1={formatDuration(longestRally.duration)}
          line2={`${tName(longestRally.match.team1)} vs ${tName(longestRally.match.team2)} · ${longestRally.match.label}`}
          onClick={() => onSelectRecord({ match: longestRally.match, title: 'Longest Rally' })}
        />
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TournamentStatsScreen({ tournament, league, leaguePlayers, onClose, tbOptions, onTbOptionsChange, isAdmin = false }) {
  const allMatches = useMemo(() => getAllMatches(tournament), [tournament])
  const playerStats = useMemo(() => computePlayerStats(allMatches), [allMatches])
  const records = useMemo(() => computeMatchRecords(allMatches), [allMatches])
  const scoringLevel = useMemo(() => resolveScoringLevel(tournament, league), [tournament, league])
  const showPlayerAwards = scoringLevel >= 2
  const DEFAULT_TB = { tieBreakerMode: 'id', seedMap: {}, drawMap: {} }
  // If not controlled from parent, fall back to local state (e.g. when used outside TournamentDetail)
  const [localTbOptions, setLocalTbOptions] = useState(DEFAULT_TB)
  const effectiveTbOptions = tbOptions ?? localTbOptions
  const effectiveOnTbOptionsChange = onTbOptionsChange ?? setLocalTbOptions
  const { addToast } = useToast()

  const handleExport = () => {
      const text = buildTournamentCoachExport(tournament, playerStats, allMatches, leaguePlayers);
      navigator.clipboard.writeText(text).then(() => {
        addToast({
            id: `copy-${Date.now()}`,
            variant: 'success',
            title: 'Copied to clipboard',
            body: 'Paste into ChatGPT or Claude with a coaching prompt.',
        });
      }).catch(console.error);
  }

  const [activeSheet, setActiveSheet] = useState(null)
  const closeSheet = () => setActiveSheet(null)

  const playerNameOf = (pid) => {
    const p = leaguePlayers.find(x => x.id === pid)
    return p ? (p.displayName || p.nickname || p.name) : 'Player'
  }

  return (
    <div className="absolute inset-0 z-[110] bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 flex-shrink-0 bg-surface border-b border-line">
        <button
          onClick={onClose}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text flex-shrink-0"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-text leading-tight truncate">
            Tournament Complete
          </div>
          <div className="text-[11px] text-dim truncate">{tournament.name}</div>
          <div className="mt-1 flex items-center gap-2">
            <AppBadge text={`Scoring level: ${scoringLevel}`} variant="dim" />
            <button
                onClick={handleExport}
                aria-label="Copy tournament stats for AI coach"
                className="flex items-center gap-1 text-[9px] font-semibold text-free bg-free/15 px-2 py-0.5 rounded cursor-pointer border-0"
            >
                <Clipboard size={10} />
                Copy AI
            </button>
          </div>
        </div>
        <Trophy size={20} className="text-accent" />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-8">

        {/* Podium */}
        <div className="pt-5 pb-4">
          <div className="px-4 mb-4">
            <SectionLabel>Podium</SectionLabel>
          </div>
          <Podium tournament={tournament} leaguePlayers={leaguePlayers} />
        </div>

        <div className="h-px bg-line mx-4 mb-5" />

        {showPlayerAwards && (
          <>
            {/* Awards */}
            <div className="mb-5">
              <div className="px-4 mb-3">
                <SectionLabel>Player Awards</SectionLabel>
              </div>
              <Awards
                playerStats={playerStats}
                leaguePlayers={leaguePlayers}
                scoringLevel={scoringLevel}
                onSelectAward={({ award, ranked }) => setActiveSheet({ kind: 'award', payload: { award, ranked } })}
              />
            </div>

            <div className="h-px bg-line mx-4 mb-5" />
          </>
        )}

        {/* Final Standings */}
        <div className="mb-5">
          <div className="px-4 mb-3 flex items-center justify-between">
            <SectionLabel>Final Standings</SectionLabel>
          </div>
          <div className="px-4 mb-3">
            {isAdmin && <TieBreakerControls teams={tournament.teams} value={effectiveTbOptions} onChange={effectiveOnTbOptionsChange} accent="accent" />}
          </div>
          <StandingsSection
            tournament={tournament}
            leaguePlayers={leaguePlayers}
            tbOptions={effectiveTbOptions}
            isAdmin={isAdmin}
            onSelectTeam={(team) => setActiveSheet({ kind: 'team', payload: { team } })}
          />
        </div>

        <div className="h-px bg-line mx-4 mb-5" />

        {/* Match Records */}
        <div className="mb-2">
          <div className="px-4 mb-3">
            <SectionLabel>Match Records</SectionLabel>
          </div>
          <MatchRecords
            records={records}
            tournament={tournament}
            onSelectRecord={({ match, title }) => setActiveSheet({ kind: 'match', payload: { match, title } })}
          />
        </div>

      </div>

      {/* ── Drill-down sheets ─────────────────────────────────────────────── */}
      <AwardRankingSheet
        open={activeSheet?.kind === 'award'}
        onClose={closeSheet}
        title={activeSheet?.payload?.award?.title}
        Icon={activeSheet?.payload?.award?.Icon}
        funny={activeSheet?.payload?.award?.funny}
        valueLabel={activeSheet?.payload?.award?.valueLabel}
        secondaryLabel={activeSheet?.payload?.award?.secondaryLabel}
        entries={activeSheet?.payload?.ranked || []}
      />

      <MatchBreakdownSheet
        open={activeSheet?.kind === 'match'}
        onClose={closeSheet}
        match={activeSheet?.payload?.match}
        tournament={tournament}
        leaguePlayers={leaguePlayers}
        recordTitle={activeSheet?.payload?.title}
      />

      <TeamDetailSheet
        open={activeSheet?.kind === 'team'}
        onClose={closeSheet}
        team={activeSheet?.payload?.team}
        allMatches={allMatches}
        leaguePlayers={leaguePlayers}
        onSelectPlayer={(pid) => setActiveSheet({
          kind: 'player',
          payload: { pid, name: playerNameOf(pid), prevTeam: activeSheet?.payload?.team },
        })}
      />

      <PlayerTournamentDetailSheet
        open={activeSheet?.kind === 'player'}
        onClose={() => {
          // Pop back to the team sheet that opened this player view.
          const prev = activeSheet?.payload?.prevTeam
          if (prev) setActiveSheet({ kind: 'team', payload: { team: prev } })
          else closeSheet()
        }}
        playerId={activeSheet?.payload?.pid}
        playerName={activeSheet?.payload?.name}
        allMatches={allMatches}
        scoringLevel={scoringLevel}
      />
    </div>
  )
}
