import {
  Trophy, Target, Zap, Shield, Bomb, Hand, Send, Medal,
  Dumbbell, Flame, RotateCcw, Clock, Volleyball, ChevronRight,
} from 'lucide-react'
import { formatDuration } from '../../lib/utils'
import { rankPlayersByStat, TOURNAMENT_RANKING_MIN_LEVELS } from '../../lib/tournamentStats'
import { AppCard } from '../ui-new'
import { AWARD_TAGLINES } from './awardCopy'

/**
 * Tournament award + match-record sections, shared by TournamentStatsScreen
 * (completed tournaments) and the live Stats tab on TournamentDetail.
 */

// ─── Awards configuration ────────────────────────────────────────────────────
// Add a new award by appending an entry. `gateKey` + `minThreshold` filter out
// players that don't meet the qualifier (e.g. "Most Efficient Server" needs
// at least 10 serves before its win-rate is meaningful).
const TOURNAMENT_AWARDS = [
  { id: 'top-scorer',      title: 'Top Scorer',          Icon: Trophy, statKey: 'points',      valueLabel: 'pts',
    tagline: AWARD_TAGLINES['top-scorer'] },
  { id: 'ace-king',        title: 'Ace King',            Icon: Target, statKey: 'aces',        valueLabel: 'aces',
    tagline: AWARD_TAGLINES['ace-king'] },
  { id: 'spike-machine',   title: 'Spike Machine',       Icon: Zap,    statKey: 'spikes',      valueLabel: 'spikes',
    tagline: AWARD_TAGLINES['spike-machine'] },
  { id: 'block-master',    title: 'Block Master',        Icon: Shield, statKey: 'blocks',      valueLabel: 'blocks',
    tagline: AWARD_TAGLINES['block-master'] },
  { id: 'tip-master',      title: 'Tip Master',          Icon: Hand,   statKey: 'tips',        valueLabel: 'tips',
    tagline: AWARD_TAGLINES['tip-master'] },
  { id: 'efficient-server',title: 'Most Efficient Server', Icon: Send, statKey: 'serveWinPct', valueLabel: '%',
    tagline: AWARD_TAGLINES['efficient-server'],
    minThreshold: 10, gateKey: 'serves', secondaryKey: 'serves', secondaryLabel: 'serves' },
  { id: 'mvp-race',        title: 'MVP Race',            Icon: Medal,  statKey: 'net',         valueLabel: 'net pts',
    tagline: AWARD_TAGLINES['mvp-race'] },
  { id: 'glass-cannon',    title: 'Glass Cannon',        Icon: Bomb,   statKey: 'errors',      valueLabel: 'errors', funny: true,
    tagline: AWARD_TAGLINES['glass-cannon'] },
]

function AwardCard(props) {
  const { Icon, title, tagline, playerName, value, valueLabel, funny = false, onClick } = props
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
      {tagline && <div className="text-[9px] text-dim leading-snug">{tagline}</div>}
      <div className="text-[14px] font-bold text-text leading-tight">{playerName}</div>
      <div className={`text-[12px] font-semibold ${funny ? 'text-error/70' : 'text-dim'}`}>
        {value} {valueLabel}
      </div>
    </AppCard>
  )
}

export function Awards({ playerStats, leaguePlayers, scoringLevel, onSelectAward }) {
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
            tagline={award.tagline}
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

export function MatchRecords({ records, tournament, onSelectRecord }) {
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
