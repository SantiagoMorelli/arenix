import { useMemo } from 'react'
import { Users, ChevronRight } from 'lucide-react'
import { AppSheet, SectionLabel } from '../ui-new'
import { computeTeamTournamentTotals } from '../../lib/tournamentStats'

/**
 * TeamDetailSheet — bottom sheet for one row of the final standings.
 *
 * Shows team players, total points scored across the whole tournament, total
 * mistakes, plus each player's net score. Tapping a player asks the parent to
 * open the per-player detail sheet via `onSelectPlayer(pid)`.
 *
 * Props:
 *   open, onClose
 *   team             — { id, name, players: [pid] }
 *   allMatches       — flattened tournament matches (from getAllMatches)
 *   leaguePlayers
 *   onSelectPlayer   — (pid) => void
 */
export default function TeamDetailSheet({
  open, onClose, team, allMatches = [], leaguePlayers = [], onSelectPlayer,
}) {
  const totals = useMemo(
    () => team ? computeTeamTournamentTotals(team, allMatches, leaguePlayers) : null,
    [team, allMatches, leaguePlayers],
  )

  if (!team || !totals) {
    return <AppSheet open={open} onClose={onClose} />
  }

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={team.name}
      icon={
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/15">
          <Users size={18} className="text-accent" />
        </div>
      }
    >
      {/* Headline numbers */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[24px] text-success leading-none">{totals.wins}</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Wins</div>
        </div>
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[24px] text-accent leading-none">{totals.pointsScored}</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Points</div>
        </div>
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[24px] text-error leading-none">{totals.mistakes}</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Mistakes</div>
        </div>
      </div>

      <SectionLabel>Players</SectionLabel>
      <div className="bg-bg rounded-[14px] border border-line overflow-hidden">
        {totals.perPlayer.length === 0 ? (
          <div className="text-[13px] text-dim text-center py-4">No players on this team.</div>
        ) : (
          totals.perPlayer.map((p, i) => {
            const isLast = i === totals.perPlayer.length - 1
            const netCls = p.net > 0 ? 'text-success' : p.net < 0 ? 'text-error' : 'text-dim'
            return (
              <button
                key={p.pid}
                onClick={() => onSelectPlayer?.(p.pid)}
                className={`w-full flex items-center px-3.5 py-3 text-left bg-transparent border-0 cursor-pointer active:bg-alt/40 transition-colors ${isLast ? '' : 'border-b border-line'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text truncate">{p.name}</div>
                  <div className="text-[10px] text-dim mt-0.5">
                    +{p.points} pts · −{p.errors} err
                  </div>
                </div>
                <div className={`font-display text-[20px] leading-none ${netCls} mr-2`}>
                  {p.net > 0 ? `+${p.net}` : p.net}
                </div>
                <ChevronRight size={16} className="text-dim flex-shrink-0" />
              </button>
            )
          })
        )}
      </div>

      <div className="text-[11px] text-dim text-center mt-3">
        Net = points scored − errors committed
      </div>
    </AppSheet>
  )
}
