import { useMemo, useState } from 'react'
import { SectionLabel } from '../ui-new'
import { getAllMatches } from '../../lib/tournament'
import { computePlayerStats, computeMatchRecords } from '../../lib/tournamentStats'
import { Awards, MatchRecords } from '../stats/TournamentAwards'
import AwardRankingSheet from '../stats/AwardRankingSheet'
import MatchBreakdownSheet from '../stats/MatchBreakdownSheet'

/**
 * StatsTab — live player-award leaders and match records for one tournament.
 * Shows the same awards as the completed-tournament stats screen, but updates
 * as matches are played, so leaders can be followed while the event is live.
 */
export default function StatsTab({ tournament, players, scoringLevel }) {
  const allMatches  = useMemo(() => getAllMatches(tournament), [tournament])
  const playerStats = useMemo(() => computePlayerStats(allMatches), [allMatches])
  const records     = useMemo(() => computeMatchRecords(allMatches), [allMatches])

  const [activeSheet, setActiveSheet] = useState(null)
  const closeSheet = () => setActiveSheet(null)

  const isLive = tournament.status !== 'completed'
  const hasPlayed = allMatches.some(m => m.played)

  if (!hasPlayed) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-10">
        No matches played yet — stats will appear as games finish
      </div>
    )
  }

  return (
    <>
      {/* Player Awards */}
      <div className="pt-3 mb-5">
        <div className="px-4">
          <SectionLabel color="accent">Player Awards</SectionLabel>
          {isLive && (
            <div className="flex items-center gap-1.5 -mt-1 mb-3">
              <span className="dot-pulse w-[6px] h-[6px] rounded-full bg-success" />
              <span className="text-[11px] text-dim">Updates live as matches are played</span>
            </div>
          )}
        </div>
        {scoringLevel >= 2 ? (
          <Awards
            playerStats={playerStats}
            leaguePlayers={players}
            scoringLevel={scoringLevel}
            onSelectAward={({ award, ranked }) => setActiveSheet({ kind: 'award', payload: { award, ranked } })}
          />
        ) : (
          <div className="px-4 text-[13px] text-dim text-center py-4">
            Per-player awards need scoring level 2 or higher
          </div>
        )}
      </div>

      <div className="h-px bg-line mx-4 mb-5" />

      {/* Match Records */}
      <div className="mb-4">
        <div className="px-4">
          <SectionLabel color="accent">Match Records</SectionLabel>
        </div>
        <MatchRecords
          records={records}
          tournament={tournament}
          onSelectRecord={({ match, title }) => setActiveSheet({ kind: 'match', payload: { match, title } })}
        />
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
        leaguePlayers={players}
        recordTitle={activeSheet?.payload?.title}
      />
    </>
  )
}
