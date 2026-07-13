import { useState } from 'react'
import {
  Trophy, Target, Zap, Shield, Hand, Send, Bomb, Medal, ChevronRight,
} from 'lucide-react'
import { SectionLabel, AppCard } from '../ui-new'
import { rankPlayersByStat } from '../../lib/tournamentStats'
import { AWARD_TAGLINES } from '../stats/awardCopy'
import AwardRankingSheet from '../stats/AwardRankingSheet'

// Same award identities as the tournament stats screen so players recognize
// them, but ranked over every tournament in the league (completed and live).
const LEAGUE_AWARDS = [
  { id: 'top-scorer',       title: 'Top Scorer',            Icon: Trophy, statKey: 'points',      valueLabel: 'pts',
    tagline: AWARD_TAGLINES['top-scorer'] },
  { id: 'spike-machine',    title: 'Spike Machine',         Icon: Zap,    statKey: 'spikes',      valueLabel: 'spikes',
    tagline: AWARD_TAGLINES['spike-machine'] },
  { id: 'ace-king',         title: 'Ace King',              Icon: Target, statKey: 'aces',        valueLabel: 'aces',
    tagline: AWARD_TAGLINES['ace-king'] },
  { id: 'block-master',     title: 'Block Master',          Icon: Shield, statKey: 'blocks',      valueLabel: 'blocks',
    tagline: AWARD_TAGLINES['block-master'] },
  { id: 'tip-master',       title: 'Tip Master',            Icon: Hand,   statKey: 'tips',        valueLabel: 'tips',
    tagline: AWARD_TAGLINES['tip-master'] },
  { id: 'efficient-server', title: 'Most Efficient Server', Icon: Send,   statKey: 'serveWinPct', valueLabel: '%',
    tagline: AWARD_TAGLINES['efficient-server'],
    minThreshold: 10, gateKey: 'serves', secondaryKey: 'serves', secondaryLabel: 'serves' },
  { id: 'mvp-race',         title: 'MVP Race',              Icon: Medal,  statKey: 'net',         valueLabel: 'net pts',
    tagline: AWARD_TAGLINES['mvp-race'] },
  { id: 'glass-cannon',     title: 'Glass Cannon',          Icon: Bomb,   statKey: 'errors',      valueLabel: 'errors', funny: true,
    tagline: AWARD_TAGLINES['glass-cannon'] },
]

/**
 * LeagueLeaders — cumulative award leaderboards across every tournament in
 * the league, live ones included. Tapping a card opens the full ranking.
 * Renders nothing when no tournament has per-player point logs yet.
 */
export default function LeagueLeaders({ leaderStats, leaguePlayers }) {
  const [activeAward, setActiveAward] = useState(null)

  const cards = LEAGUE_AWARDS.map(award => {
    const ranked = rankPlayersByStat(leaderStats, award.statKey, {
      leaguePlayers,
      minThreshold: award.minThreshold || 0,
      gateKey: award.gateKey,
      secondaryKey: award.secondaryKey,
    })
    if (!ranked.length) return null
    return { award, winner: ranked[0], ranked }
  }).filter(Boolean)

  if (!cards.length) return null

  return (
    <>
      <SectionLabel color="accent">League Leaders</SectionLabel>
      <div className="text-[11px] text-dim -mt-1.5 mb-2.5">
        All tournaments — completed and live
      </div>

      <div className="grid grid-cols-2 gap-2 mb-1">
        {cards.map(({ award, winner, ranked }) => {
          const { Icon, funny } = award
          const accentText = funny ? 'text-error' : 'text-accent'
          return (
            <AppCard
              key={award.id}
              className={`flex flex-col gap-1 ${funny ? 'bg-error/10 border-error/30' : ''}`}
              onClick={() => setActiveAward({ award, ranked })}
            >
              <div className="flex items-center justify-between">
                <Icon size={18} className={accentText} />
                <ChevronRight size={14} className="text-dim" />
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-[0.5px] ${accentText}`}>
                {award.title}
              </div>
              <div className="text-[13px] font-bold text-text leading-tight truncate">
                {winner.name}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`font-display text-[22px] leading-none ${funny ? 'text-error' : 'text-text'}`}>
                  {winner.value}
                </span>
                <span className={`text-[10px] font-semibold ${funny ? 'text-error/70' : 'text-dim'}`}>
                  {award.valueLabel}
                </span>
              </div>
            </AppCard>
          )
        })}
      </div>
      <div className="text-[11px] text-dim text-center mb-4">
        Tap an award to see the full ranking
      </div>

      <AwardRankingSheet
        open={!!activeAward}
        onClose={() => setActiveAward(null)}
        title={activeAward?.award?.title}
        tagline={activeAward?.award?.tagline}
        Icon={activeAward?.award?.Icon}
        funny={activeAward?.award?.funny}
        valueLabel={activeAward?.award?.valueLabel}
        secondaryLabel={activeAward?.award?.secondaryLabel}
        entries={activeAward?.ranked || []}
      />
    </>
  )
}
