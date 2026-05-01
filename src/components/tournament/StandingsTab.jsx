import { useState } from 'react'
import { calcGroupStandings, calcOverallStandings } from '../../lib/tournament'
import StandingsTable from './StandingsTable'
import KnockoutResults from './KnockoutResults'
import TieBreakerControls from '../standings/TieBreakerControls'

export default function StandingsTab({ tournament, onGenerateKnockout, onMatchClick, canManage, players }) {
  const { phase, groups, teams, matches } = tournament
  const hasGroups = (groups || []).length > 0

  const [tbOptions, setTbOptions] = useState({ tieBreakerMode: 'id', seedMap: {}, drawMap: {} })

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

  // Free-play / round-robin (no groups)
  if (!hasGroups) {
    const rows = calcOverallStandings(teams, matches, players, tbOptions)
    return (
      <div className="px-4">
        {canManage && (
          <TieBreakerControls teams={teams} value={tbOptions} onChange={setTbOptions} accent="accent" />
        )}
        <StandingsTable rows={rows} />
      </div>
    )
  }

  // Group stage → show each group, then knockout below
  return (
    <div className="px-4">
      {canManage && (
        <TieBreakerControls teams={teams} value={tbOptions} onChange={setTbOptions} accent="accent" />
      )}

      {groups.map(group => {
        return (
          <div key={group.id} className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[12px] font-bold text-accent tracking-wide uppercase">
                {group.name}
              </div>
              {tbOptions.tieBreakerMode !== 'id' && (
                <div className="text-[10px] text-dim font-semibold uppercase">
                  TB: {tbOptions.tieBreakerMode}
                </div>
              )}
            </div>
            <StandingsTable rows={calcGroupStandings(group, teams, players, tbOptions)} />
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
            onClick={onGenerateKnockout}
            disabled={!allGroupMatchesPlayed}
            className={`w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white border-0 transition-all ${
              allGroupMatchesPlayed ? 'bg-free cursor-pointer hover:opacity-90' : 'bg-surface border border-line text-dim cursor-not-allowed'
            }`}
          >
            {allGroupMatchesPlayed ? '⚡ Generate Knockout' : '⏳ Complete all group matches first'}
          </button>
        </div>
      )}
    </div>
  )
}
