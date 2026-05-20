import { calcGroupStandings, calcOverallStandings } from '../../lib/tournament'
import StandingsTable from './StandingsTable'
import KnockoutResults from './KnockoutResults'
import TieBreakerControls from '../standings/TieBreakerControls'
import { useToast } from '../../contexts/ToastContext'

export default function StandingsTab({
  tournament,
  onGenerateKnockout,
  onMatchClick,
  canManage,
  players,
  tbOptions,
  onTbOptionsChange,
  currentUserId,
  isAdmin,
  onRenameTeam,
  isGeneratingKnockout = false,
}) {
  const { showToast } = useToast()
  const { phase, groups, teams, matches } = tournament
  const hasGroups = (groups || []).length > 0

  const allGroupMatchesPlayed = hasGroups && groups.every(g =>
    g.matches.every(m => m.played)
  )

  if (phase === 'setup' && !hasGroups && !(matches || []).length) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-10">
        Tournament hasn&apos;t started yet
      </div>
    )
  }

  const handleGenerateClick = () => {
    let hasTie = false;
    let tieDetails = [];

    if (hasGroups) {
      groups.forEach(g => {
        const st = calcGroupStandings(g, teams, players, tbOptions);
        const top3 = st.slice(0, 3);
        const hasUnresolved = top3.some(t => t._unresolvedTie && !t._resolvedExplicitly);
        if (hasUnresolved) {
          hasTie = true;
          tieDetails.push(g.name);
        }
      });
    } else {
      const rows = calcOverallStandings(teams, matches, players, tbOptions);
      const top3 = rows.slice(0, 3);
      const hasUnresolved = top3.some(t => t._unresolvedTie && !t._resolvedExplicitly);
      if (hasUnresolved) {
        hasTie = true;
      }
    }

    if (hasTie) {
      const title = hasGroups
        ? `Tie in: ${tieDetails.join(', ')}`
        : 'Exact tie detected'
      const body = 'Set a Tie-Breaker rule (Seed or Draw) and assign values to tied teams before generating.'
      showToast({ variant: 'info', title, body })
      return;
    }

    if (hasGroups) {
      onGenerateKnockout();
    } else {
      const rows = calcOverallStandings(teams, matches, players, tbOptions);
      onGenerateKnockout(rows);
    }
  }

  // Free-play / round-robin (no groups)
  if (!hasGroups) {
    const rows = calcOverallStandings(teams, matches, players, tbOptions)
    const allMatchesPlayed = matches && matches.length > 0 && matches.every(m => m.played)
    
    return (
      <div className="px-4">
        {isAdmin && (
          <TieBreakerControls teams={teams} value={tbOptions} onChange={onTbOptionsChange} accent="accent" />
        )}
        <StandingsTable
          rows={rows}
          teams={teams}
          leaguePlayers={players}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onRenameTeam={onRenameTeam}
        />

        {/* Advance button — only for admins */}
        {(phase === 'freeplay' || phase === 'setup' || phase === 'group') && canManage && (matches || []).length > 0 && (
          <div className="mt-4 mb-6">
            <button
              onClick={handleGenerateClick}
              disabled={!allMatchesPlayed || isGeneratingKnockout}
              className={`w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white border-0 transition-all ${
                allMatchesPlayed && !isGeneratingKnockout
                  ? 'bg-free cursor-pointer hover:opacity-90'
                  : 'bg-surface border border-line text-dim cursor-not-allowed'
              }`}
            >
              {isGeneratingKnockout
                ? '⏳ Generating Final...'
                : (allMatchesPlayed ? '⚡ Generate Final (1º vs 2º)' : '⏳ Complete all matches first')}
            </button>
          </div>
        )}

        {/* Knockout results if final was generated */}
        {(phase === 'knockout' || phase === 'completed') && (
          <KnockoutResults tournament={tournament} onMatchClick={onMatchClick} players={players} />
        )}
      </div>
    )
  }

  // Group stage → show each group, then knockout below
  return (
    <div className="px-4">
      {isAdmin && (
        <TieBreakerControls teams={teams} value={tbOptions} onChange={onTbOptionsChange} accent="accent" />
      )}

      {groups.map(group => {
        return (
          <div key={group.id} className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[12px] font-bold text-accent tracking-wide uppercase">
                {group.name}
              </div>
              {isAdmin && tbOptions.tieBreakerMode !== 'id' && (
                <div className="text-[10px] text-dim font-semibold uppercase">
                  TB: {tbOptions.tieBreakerMode}
                </div>
              )}
            </div>
            <StandingsTable
              rows={calcGroupStandings(group, teams, players, tbOptions)}
              teams={teams}
              leaguePlayers={players}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRenameTeam={onRenameTeam}
            />
          </div>
        )
      })}

      {/* Knockout results appear once the group stage is over */}
      {(phase === 'knockout' || phase === 'completed') && (
        <KnockoutResults tournament={tournament} onMatchClick={onMatchClick} players={players} />
      )}

      {/* Advance button — only for admins */}
      {phase === 'group' && canManage && (
        <div className="mt-2 mb-6">
          <button
            onClick={handleGenerateClick}
            disabled={!allGroupMatchesPlayed || isGeneratingKnockout}
            className={`w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white border-0 transition-all ${
              allGroupMatchesPlayed && !isGeneratingKnockout
                ? 'bg-free cursor-pointer hover:opacity-90'
                : 'bg-surface border border-line text-dim cursor-not-allowed'
            }`}
          >
            {isGeneratingKnockout
              ? '⏳ Generating knockout...'
              : (allGroupMatchesPlayed ? '⚡ Generate Knockout' : '⏳ Complete all group matches first')}
          </button>
        </div>
      )}
    </div>
  )
}
