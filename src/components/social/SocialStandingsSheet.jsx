/**
 * SocialStandingsSheet — the full league table, social-view styling.
 *
 * The feed intentionally stays a stream of moments; the ranked table lives
 * here, one tap away from the bottom bar.
 */
import { createPortal } from 'react-dom'
import { X, ArrowDown, ArrowUp } from 'lucide-react'
import SocialAvatar from './SocialAvatar'
import { computeRankMovement } from '../../lib/leagueInsights'

const MEDAL = {
  1: 'text-soc-lime',
  2: 'text-soc-cyan',
  3: 'text-soc-violet',
}

export default function SocialStandingsSheet({ open, onClose, rankedPlayers, insights, currentUserId, onSelect }) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end font-sans">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-[151] w-full bg-soc-surface text-soc-text rounded-t-[28px] px-4 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto shadow-2xl border-t border-soc-line">
        <div className="w-9 h-1 bg-soc-line rounded-full mx-auto mb-4" />

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 font-soc text-[22px] leading-tight">Standings</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-soc-alt flex items-center justify-center text-soc-dim cursor-pointer border-0 shrink-0"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {rankedPlayers.length === 0 && (
          <div className="text-[12px] text-soc-dim text-center py-8">
            No players in this league yet.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {rankedPlayers.map((p, i) => {
            const rank   = i + 1
            const isMe   = Boolean(currentUserId && p.userId === currentUserId)
            const streak = insights?.streaks?.get(p.id)
            const move   = insights?.timelines ? computeRankMovement(insights.timelines, p.id) : null

            return (
              <button
                key={p.id}
                onClick={() => onSelect?.(p, rank)}
                className={`w-full flex items-center gap-3 rounded-[16px] px-3 py-2.5 border cursor-pointer active:scale-[0.99] transition-transform text-left ${
                  isMe ? 'bg-soc-lime/10 border-soc-lime/40' : 'bg-soc-alt/50 border-transparent'
                }`}
              >
                <span className={`font-soc text-[18px] w-7 shrink-0 tabular-nums ${MEDAL[rank] || 'text-soc-dim'}`}>
                  {rank}
                </span>
                <SocialAvatar player={p} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">
                    {p.displayName || p.name}{isMe && <span className="text-soc-lime"> · you</span>}
                  </div>
                  <div className="text-[10px] text-soc-dim">
                    {streak?.wins ?? 0}W · {streak?.losses ?? 0}L
                  </div>
                </div>
                {move && move.delta !== 0 && (
                  <span className={`flex items-center text-[10px] font-bold shrink-0 ${move.delta > 0 ? 'text-soc-lime' : 'text-soc-pink'}`}>
                    {move.delta > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    {Math.abs(move.delta)}
                  </span>
                )}
                <span className="font-soc text-[18px] text-soc-text tabular-nums shrink-0">
                  {p.elo ?? 1000}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
