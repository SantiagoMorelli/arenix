import { AppButton, SectionLabel } from '../ui-new'
import TeamCard from './TeamCard'

export default function TeamsTab({ session, isFinished, isAdmin, onNewTeam, onEditTeam, onDeleteTeam }) {
  return (
    <div className="px-4">
      <SectionLabel color="free">
        Teams ({session.teams.length})
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
