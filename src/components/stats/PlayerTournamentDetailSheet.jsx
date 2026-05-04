import { useMemo } from 'react'
import { User } from 'lucide-react'
import { AppSheet, SectionLabel } from '../ui-new'
import { computePlayerTournamentBreakdown } from '../../lib/tournamentStats'
import { POINT_TYPES, ERROR_SUBTYPES } from './pointTypes'

/**
 * PlayerTournamentDetailSheet — bottom sheet for one player's tournament stats.
 *
 * Props:
 *   open, onClose
 *   playerId
 *   playerName
 *   allMatches
 */
export default function PlayerTournamentDetailSheet({
  open, onClose, playerId, playerName, allMatches = [],
}) {
  const data = useMemo(
    () => playerId ? computePlayerTournamentBreakdown(playerId, allMatches) : null,
    [playerId, allMatches],
  )

  if (!playerId || !data) {
    return <AppSheet open={open} onClose={onClose} />
  }

  // Filter point types relevant to scoring breakdown
  const scoringTypes = POINT_TYPES.filter(pt => pt.id !== 'error')
  const maxScored = Math.max(1, ...scoringTypes.map(pt => data.byType[pt.id] || 0))
  const maxError  = Math.max(1, ...ERROR_SUBTYPES.map(es => data.errorsByType[es.id] || 0))

  const netCls = data.net > 0 ? 'text-success' : data.net < 0 ? 'text-error' : 'text-dim'

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={playerName || 'Player'}
      icon={
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/15">
          <User size={18} className="text-accent" />
        </div>
      }
    >
      {/* Headline numbers */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[26px] text-accent leading-none">{data.points}</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Points</div>
        </div>
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[26px] text-error leading-none">{data.errors}</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Errors</div>
        </div>
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className={`font-display text-[26px] leading-none ${netCls}`}>
            {data.net > 0 ? `+${data.net}` : data.net}
          </div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Net</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[18px] text-text leading-none">{data.matchesPlayed}</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Matches</div>
        </div>
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[18px] text-text leading-none">{data.setsPlayed}</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Sets</div>
        </div>
      </div>

      <SectionLabel>Points by type</SectionLabel>
      <div className="flex flex-col gap-1.5 mb-4">
        {scoringTypes.map(pt => {
          const v = data.byType[pt.id] || 0
          const Icon = pt.icon
          const pct = (v / maxScored) * 100
          return (
            <div key={pt.id} className="bg-bg border border-line rounded-[12px] px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} className="text-accent" />
                <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-dim flex-1">{pt.label}</span>
                <span className="font-display text-[14px] text-text">{v}</span>
              </div>
              <div className="h-1.5 rounded-full bg-alt overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <SectionLabel>Errors by type</SectionLabel>
      <div className="flex flex-col gap-1.5 mb-4">
        {ERROR_SUBTYPES.map(es => {
          const v = data.errorsByType[es.id] || 0
          const Icon = es.icon
          const pct = (v / maxError) * 100
          return (
            <div key={es.id} className="bg-bg border border-line rounded-[12px] px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} className="text-error" />
                <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-dim flex-1">{es.label}</span>
                <span className="font-display text-[14px] text-text">{v}</span>
              </div>
              <div className="h-1.5 rounded-full bg-alt overflow-hidden">
                <div className="h-full bg-error" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      {data.errorsByType.untyped > 0 && (
        <div className="text-[11px] text-dim text-center -mt-2 mb-3">
          "Untyped" = errors logged before subtypes were captured.
        </div>
      )}

      <SectionLabel>Serving</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[20px] text-text leading-none">{data.serves}</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Serves</div>
        </div>
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[20px] text-success leading-none">{data.serveWinPct}%</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Win rate</div>
        </div>
        <div className="bg-bg border border-line rounded-[12px] p-3 text-center">
          <div className="font-display text-[20px] text-accent leading-none">{data.serveAces}</div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.5px] mt-1">Aces</div>
        </div>
      </div>
    </AppSheet>
  )
}
