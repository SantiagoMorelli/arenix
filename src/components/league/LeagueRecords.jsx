import { useNavigate } from 'react-router-dom'
import { Dumbbell, Scale, Flame, Star, ChevronRight } from 'lucide-react'
import { SectionLabel, AppCard } from '../ui-new'

function RecordCard(props) {
  const { Icon, title, line1, line2, onClick } = props
  return (
    <AppCard className="flex flex-col gap-1" onClick={onClick}>
      <div className="flex items-center justify-between">
        <Icon size={18} className="text-accent" />
        <ChevronRight size={14} className="text-dim" />
      </div>
      <div className="text-[10px] font-bold text-accent uppercase tracking-[0.5px]">{title}</div>
      <div className="text-[13px] font-bold text-text leading-snug">{line1}</div>
      {line2 && <div className="text-[11px] text-dim leading-tight">{line2}</div>}
    </AppCard>
  )
}

/**
 * LeagueRecords — all-time records across every tournament (completed and
 * live). Match records navigate to their tournament; player records open the
 * player stats sheet via `onSelectPlayer(playerId)`.
 */
export default function LeagueRecords({ records, league, onSelectPlayer }) {
  const navigate = useNavigate()
  if (!records) return null

  const { biggestBlowout, closestMatch, bestStreak, bestSingleMatch } = records
  const goToTournament = (tid) => navigate(`/league/${league.id}/tournament/${tid}`)

  return (
    <>
      <SectionLabel color="accent">League Records</SectionLabel>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {biggestBlowout && (
          <RecordCard
            Icon={Dumbbell}
            title="Biggest Blowout"
            line1={`${biggestBlowout.winnerLabel} won`}
            line2={`${biggestBlowout.winnerScore}–${biggestBlowout.loserScore} · ${biggestBlowout.tournamentName}`}
            onClick={() => goToTournament(biggestBlowout.tournamentId)}
          />
        )}
        {closestMatch && (
          <RecordCard
            Icon={Scale}
            title="Closest Match"
            line1={`${closestMatch.team1Label} vs ${closestMatch.team2Label}`}
            line2={`${closestMatch.score1}–${closestMatch.score2} · ${closestMatch.tournamentName}`}
            onClick={() => goToTournament(closestMatch.tournamentId)}
          />
        )}
        {bestStreak && (
          <RecordCard
            Icon={Flame}
            title="Longest Win Streak"
            line1={`${bestStreak.streak} wins in a row`}
            line2={bestStreak.name}
            onClick={() => onSelectPlayer(bestStreak.playerId)}
          />
        )}
        {bestSingleMatch && (
          <RecordCard
            Icon={Star}
            title="Best Single Match"
            line1={`${bestSingleMatch.points} pts in one match`}
            line2={`${bestSingleMatch.name} · ${bestSingleMatch.tournamentName}`}
            onClick={() => onSelectPlayer(bestSingleMatch.playerId)}
          />
        )}
      </div>
    </>
  )
}
