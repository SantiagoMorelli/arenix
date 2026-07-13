import { Trophy } from 'lucide-react'
import { playerAvatarStyle, playerInitials } from '../../lib/utils'

// Static class maps so Tailwind can see every class name
const TIER_CARD = {
  gold:     'bg-gradient-to-br from-accent/25 via-surface to-alt border-accent/50',
  silver:   'bg-gradient-to-br from-dim/15 to-surface border-line',
  standard: 'bg-surface border-line',
}
const TIER_RANK = {
  gold:     'bg-accent text-white',
  silver:   'bg-dim/30 text-text',
  standard: 'bg-alt text-dim',
}
const BAR_FILL = {
  accent:  'bg-accent',
  free:    'bg-free',
  success: 'bg-success',
  dim:     'bg-dim',
}

/**
 * PlayerCard — FIFA-style league card: big ELO rating, playstyle, stat bars
 * normalized against the league's best, and honors. Model comes from
 * computePlayerCard (lib/playerCard.js).
 */
export default function PlayerCard({ player, card }) {
  const label = player.displayName || player.name

  return (
    <div className={`relative rounded-2xl border p-4 ${TIER_CARD[card.tier]}`}>
      {card.rank != null && (
        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-bold ${TIER_RANK[card.tier]}`}>
          #{card.rank}
        </span>
      )}

      {/* Rating + identity */}
      <div className="flex items-center gap-3.5 mb-1">
        <div className="flex flex-col items-center flex-shrink-0">
          <span className={`font-display text-[44px] leading-none ${card.tier === 'gold' ? 'text-accent' : 'text-text'}`}>
            {card.elo}
          </span>
          <span className="text-[9px] font-bold text-dim uppercase tracking-[1.5px] mt-0.5">ELO</span>
        </div>
        <div className="w-px self-stretch bg-line" />
        <div className="flex items-center gap-2.5 min-w-0 pr-10">
          <div
            className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[17px] font-semibold text-white flex-shrink-0"
            style={playerAvatarStyle(player.id || player.name)}
          >
            {playerInitials(label)}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-text truncate">{label}</div>
            {card.style && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-[0.5px]">
                {card.style}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stat bars */}
      {card.bars.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-line/60">
          {card.bars.map(bar => (
            <div key={bar.key} className="flex items-center gap-2">
              <span className="w-7 text-[9px] font-bold text-dim tracking-[0.5px] flex-shrink-0">{bar.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-line/50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${BAR_FILL[bar.color]}`}
                  style={{ width: `${Math.min(100, Math.max(bar.pct, bar.value > 0 ? 6 : 0))}%` }}
                />
              </div>
              <span className="w-8 font-display text-[14px] leading-none text-text text-right flex-shrink-0">
                {bar.value}{bar.suffix || ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Honors footer */}
      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-line/60 text-[11px] text-dim">
        <span><span className="font-bold text-text">{card.wins}W - {card.losses}L</span> record</span>
        {card.wins + card.losses > 0 && <span>{card.winPct}% wins</span>}
        {card.titles > 0 && (
          <span className="flex items-center gap-1 text-accent font-bold ml-auto">
            <Trophy size={12} /> ×{card.titles}
          </span>
        )}
      </div>
    </div>
  )
}
