import { useMemo, useState } from 'react'
import { ChevronLeft, Trophy, Medal, Clipboard } from 'lucide-react'
import { calcOverallStandings } from '../lib/standings'
import { getAllMatches } from '../lib/tournament'
import { resolveScoringLevel } from '../lib/scoring'
import { computePlayerStats, computeMatchRecords } from '../lib/tournamentStats'
import { AppBadge } from './ui-new'
import { HelpToggle, SectionLabelWithHelp, HelpDiscoveryHint } from './stats/StatInfo'
import { EXPLANATIONS } from './stats/explanations'
import { Awards, MatchRecords } from './stats/TournamentAwards'
import StandingsLegend from './stats/StandingsLegend'
import { useLocalStorage } from '../hooks/useLocalStorage'
import TieBreakerControls from './standings/TieBreakerControls'
import AwardRankingSheet from './stats/AwardRankingSheet'
import MatchBreakdownSheet from './stats/MatchBreakdownSheet'
import TeamDetailSheet from './stats/TeamDetailSheet'
import PlayerTournamentDetailSheet from './stats/PlayerTournamentDetailSheet'
import { useToast } from '../contexts/ToastContext'
import { buildTournamentCoachExport } from '../lib/tournamentStatsExport'

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
              <span className="mr-3 text-[10px] font-bold text-dim uppercase">Tie-break: by {tbOptions?.tieBreakerMode}</span>
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
        {rows.length > 0 && <StandingsLegend />}
      </div>
      <div className="text-[11px] text-dim text-center mt-3">
        Tap a team to see player stats
      </div>
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
  const [helpMode, setHelpMode] = useState(false)
  const [helpHintSeen, setHelpHintSeen] = useLocalStorage('arenix-help-hint-seen', false)
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
        <HelpToggle on={helpMode} onChange={(val) => { setHelpMode(val); setHelpHintSeen(true) }} />
        <Trophy size={20} className="text-accent" />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-8">

        <div className="px-4 pt-3 -mb-3">
          <HelpDiscoveryHint show={!helpHintSeen} onDismiss={() => setHelpHintSeen(true)} />
        </div>

        {/* Podium */}
        <div className="pt-5 pb-4">
          <div className="px-4 mb-4">
            <SectionLabelWithHelp helpMode={helpMode} explanation={EXPLANATIONS.podium}>Podium</SectionLabelWithHelp>
          </div>
          <Podium tournament={tournament} leaguePlayers={leaguePlayers} />
        </div>

        <div className="h-px bg-line mx-4 mb-5" />

        {showPlayerAwards && (
          <>
            {/* Awards */}
            <div className="mb-5">
              <div className="px-4 mb-3">
                <SectionLabelWithHelp helpMode={helpMode} explanation={EXPLANATIONS.playerAwards}>Player Awards</SectionLabelWithHelp>
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
          <div className="px-4 mb-3">
            <SectionLabelWithHelp helpMode={helpMode} explanation={EXPLANATIONS.finalStandings}>Final Standings</SectionLabelWithHelp>
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
            <SectionLabelWithHelp helpMode={helpMode} explanation={EXPLANATIONS.matchRecords}>Match Records</SectionLabelWithHelp>
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
        tagline={activeSheet?.payload?.award?.tagline}
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
