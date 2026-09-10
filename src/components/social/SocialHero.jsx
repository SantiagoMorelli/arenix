/**
 * SocialHero — the viewer's own card at the top of the social feed.
 *
 * Deliberately oversized and editorial: the rank is the loudest thing on the
 * screen, the way a profile header works on a social app. Renders nothing when
 * the viewer isn't linked to a player in this league (guests, spectators).
 */
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import SocialAvatar from './SocialAvatar'

export default function SocialHero({ player, rank, total, streak, movement, onOpen }) {
  if (!player || !rank) return null

  const wins   = streak?.wins   ?? 0
  const losses = streak?.losses ?? 0
  const delta  = movement?.delta ?? 0

  const deltaChip =
    delta > 0 ? { Icon: ArrowUp,   cls: 'text-soc-lime',  text: `+${delta}` } :
    delta < 0 ? { Icon: ArrowDown, cls: 'text-soc-pink',  text: `${delta}`  } :
                { Icon: Minus,     cls: 'text-soc-dim',   text: 'even'      }

  return (
    <button
      onClick={onOpen}
      className="w-full text-left block relative overflow-hidden rounded-[26px] border border-soc-line bg-gradient-to-br from-soc-violet/30 via-soc-surface to-soc-surface p-5 mb-5 cursor-pointer active:scale-[0.99] transition-transform"
    >
      {/* soft glow behind the rank */}
      <div className="absolute -top-16 -left-10 w-52 h-52 rounded-full bg-soc-violet/25 blur-3xl pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[2px] text-soc-lime mb-1">
            Your season
          </div>
          <div className="flex items-end gap-2.5">
            <span className="font-soc text-[62px] leading-[0.82] text-soc-text">
              {rank}
              <span className="text-[26px] align-top text-soc-dim">/{total}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[13px] font-bold text-soc-text">{player.elo ?? 1000}</span>
            <span className="text-[11px] text-soc-dim">ELO</span>
            <span className="w-px h-3 bg-soc-line" />
            <span className="text-[11px] text-soc-dim">{wins}W · {losses}L</span>
            <span className={`flex items-center gap-0.5 text-[11px] font-bold ${deltaChip.cls}`}>
              <deltaChip.Icon size={11} />
              {deltaChip.text}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-center gap-2">
          <SocialAvatar player={player} size="xl" ring="lime" />
          {streak?.last5?.length > 0 && (
            <div className="flex items-center gap-1">
              {streak.last5.map((r, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${r === 'W' ? 'bg-soc-lime' : 'bg-soc-pink/70'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
