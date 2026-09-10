/**
 * StoryRail — horizontally scrolling row of players, Instagram-stories style.
 *
 * The ring encodes current form: a sweeping gradient for an active win streak,
 * pink for a losing run, flat line for everyone else. Tapping a player opens
 * SocialPlayerSheet.
 */
import SocialAvatar from './SocialAvatar'

function ringFor(entry) {
  const s = entry.streak
  if (!s) return 'dim'
  if (s.current >= 2) return 'hot'
  if (s.last5?.length && s.last5[s.last5.length - 1] === 'L') return 'pink'
  return 'dim'
}

function badgeFor(entry) {
  const s = entry.streak
  if (s?.current >= 2) return { text: `W${s.current}`, cls: 'bg-soc-lime text-soc-bg' }
  if (entry.rank <= 3)  return { text: `#${entry.rank}`, cls: 'bg-soc-violet text-white' }
  return null
}

export default function StoryRail({ entries, onSelect }) {
  if (!entries?.length) return null

  return (
    <div className="-mx-4 mb-1">
      <div className="flex gap-3.5 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entries.map(entry => {
          const badge = badgeFor(entry)
          const ring  = ringFor(entry)
          return (
            <button
              key={entry.player.id}
              onClick={() => onSelect?.(entry.player)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] bg-transparent border-0 p-0 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="relative">
                <SocialAvatar
                  player={entry.player}
                  size="lg"
                  ring={ring}
                  spin={ring === 'hot'}
                />
                {badge && (
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 px-1.5 py-px rounded-full text-[9px] font-bold tracking-wide border-2 border-soc-bg ${badge.cls}`}
                  >
                    {badge.text}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-soc-text/90 font-medium truncate max-w-full leading-tight">
                {entry.isMe ? 'You' : (entry.player.displayName || entry.player.name)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
