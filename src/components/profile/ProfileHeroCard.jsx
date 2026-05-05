/**
 * Sticky hero card. Avatar, name, country flag, 3 headline stats.
 * Sticky positioning is applied by the parent container.
 */

const FLAG = {
  argentina: '🇦🇷', 'united states': '🇺🇸', brazil: '🇧🇷', spain: '🇪🇸',
  colombia: '🇨🇴', mexico: '🇲🇽', chile: '🇨🇱', uruguay: '🇺🇾',
  france: '🇫🇷', germany: '🇩🇪', italy: '🇮🇹', australia: '🇦🇺',
  portugal: '🇵🇹', japan: '🇯🇵', canada: '🇨🇦', uk: '🇬🇧',
  'united kingdom': '🇬🇧', netherlands: '🇳🇱', sweden: '🇸🇪', norway: '🇳🇴',
}

function countryFlag(country) {
  if (!country) return ''
  return FLAG[country.toLowerCase()] || ''
}

function hueFromString(str) {
  if (!str) return 200
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return h % 360
}

export default function ProfileHeroCard({ profile, stats, subLine }) {
  const nickname = profile?.nickname?.trim() || ''
  const displayName = nickname || profile?.full_name?.split(' ')[0] || 'Player'
  const fullName = profile?.full_name
  const flag = countryFlag(profile?.country)
  const avatarUrl = profile?.avatar_url?.startsWith('http') ? profile.avatar_url : null

  const initials = (fullName || displayName || '?')
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
  const hue = hueFromString(profile?.id || fullName || '')
  const size = 64

  return (
    <div className="bg-gradient-to-br from-surface to-alt rounded-[14px] border border-line p-3 text-center">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              style={{ width: size, height: size, borderRadius: Math.round(size * 0.32) }}
              className="object-cover"
            />
          ) : (
            <div
              className="flex items-center justify-center font-bold text-white"
              style={{
                width: size, height: size,
                borderRadius: Math.round(size * 0.32),
                background: `oklch(0.55 0.15 ${hue})`,
                fontSize: Math.round(size * 0.38),
                letterSpacing: '-0.5px',
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Identity + stats */}
        <div className="flex-1 min-w-0 text-left">
          <div className="font-display text-text leading-none truncate" style={{ fontSize: 22 }}>
            {displayName}{flag && <span className="ml-1.5 text-[18px]">{flag}</span>}
          </div>
          {subLine && (
            <div className="text-[11px] text-dim mt-0.5 truncate">{subLine}</div>
          )}
          <div className="flex gap-3 mt-2">
            {(stats || []).map(s => (
              <div key={s.label} className="min-w-0">
                <div className={`font-display leading-none ${s.colorClass}`} style={{ fontSize: 18 }}>
                  {s.value}
                </div>
                <div className="text-[9px] text-dim mt-0.5 uppercase tracking-wide truncate">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
