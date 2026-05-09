import { useMemo } from 'react'
import { AppButton, SectionLabel } from '../ui-new'
import TeamCard from './TeamCard'
import { TeamsRankingTable } from './RankingTables'
import { calcOverallStandings } from '../../lib/standings'

export default function TeamsTab({ session, isFinished, isAdmin, onNewTeam, onEditTeam, onDeleteTeam }) {
  const matches = useMemo(() => (session.games || [])
    .filter(g => g.played)
    .map(g => ({
      team1:  g.team1Id,
      team2:  g.team2Id,
      score1: g.setsPerMatch > 1
        ? (g.sets || []).filter(s => s.winner === 1).length
        : (g.score1 ?? 0),
      score2: g.setsPerMatch > 1
        ? (g.sets || []).filter(s => s.winner === 2).length
        : (g.score2 ?? 0),
      played: true,
    })),
  [session.games])

  // hardcode tie breaker logic matching old default
  const tbOptions = { tieBreakerMode: 'id', seedMap: {}, drawMap: {} }

  const teamRows = useMemo(
    () => calcOverallStandings(session.teams || [], matches, session.players || [], tbOptions),
    [session.teams, matches, session.players]
  )

  return (
    <div className="px-4">
      <SectionLabel color="free">
        Team Standings
      </SectionLabel>
      <div className="mb-8">
        <TeamsRankingTable rows={teamRows} />
      </div>

      <SectionLabel color="free">
        Manage Teams ({session.teams.length})
      </SectionLabel>

      {session.teams.length === 0 ? (
        <div className="text-[13px] text-dim mb-4">No teams yet — create one below.</div>
      ) : (
        <div className="flex flex-col gap-3 mb-4">
          {session.teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              players={session.players}
              readonly={!isAdmin || isFinished}
              onEdit={() => onEditTeam(team)}
              onDelete={() => onDeleteTeam(team.id)}
            />
          ))}
        </div>
      )}

      {isAdmin && !isFinished && (
        <AppButton
          variant="outline"
          onClick={onNewTeam}
          className="border-free/40 text-free hover:bg-free/5"
        >
          + New Team
        </AppButton>
      )}
    </div>
  )
}
