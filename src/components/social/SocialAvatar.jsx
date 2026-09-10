/**
 * SocialAvatar — round player avatar for the social league view.
 *
 * Falls back to deterministic-colour initials when the player has no linked
 * profile picture. `ring` draws the story-style halo used by the rail and the
 * feed headers.
 */
import { playerAvatarStyle, playerInitials } from '../../lib/utils'

const SIZES = {
  xs: { box: 'w-7 h-7',   text: 'text-[10px]' },
  sm: { box: 'w-9 h-9',   text: 'text-[12px]' },
  md: { box: 'w-11 h-11', text: 'text-[14px]' },
  lg: { box: 'w-16 h-16', text: 'text-[19px]' },
  xl: { box: 'w-20 h-20', text: 'text-[24px]' },
}

const RINGS = {
  none: '',
  dim:  'bg-soc-line',
  lime: 'bg-soc-lime',
  pink: 'bg-soc-pink',
  cyan: 'bg-soc-cyan',
  // Live streak — a sweeping conic gradient, like an unread story
  hot:  'bg-[conic-gradient(from_0deg,var(--color-soc-lime),var(--color-soc-cyan),var(--color-soc-violet),var(--color-soc-pink),var(--color-soc-lime))]',
}

export default function SocialAvatar({ player, size = 'md', ring = 'none', spin = false }) {
  const s    = SIZES[size] || SIZES.md
  const name = player?.displayName || player?.name || '?'

  const face = player?.avatarUrl ? (
    <img
      src={player.avatarUrl}
      alt={name}
      className={`${s.box} rounded-full object-cover`}
      loading="lazy"
    />
  ) : (
    <div
      className={`${s.box} ${s.text} rounded-full flex items-center justify-center font-bold text-white/90 select-none`}
      // oklch() hue is derived per player — can't be a static Tailwind utility
      style={playerAvatarStyle(player?.id || name)}
    >
      {playerInitials(name)}
    </div>
  )

  if (ring === 'none') return face

  return (
    <div className="relative p-[2px] rounded-full inline-flex">
      <div
        className={`absolute inset-0 rounded-full ${RINGS[ring] || RINGS.dim} ${spin ? 'animate-soc-ring' : ''}`}
      />
      <div className="relative rounded-full p-[2px] bg-soc-bg">{face}</div>
    </div>
  )
}
