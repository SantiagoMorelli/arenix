/**
 * Circular progress ring with a value in the center. Pure inline SVG + Tailwind,
 * tokens-only — same pattern as the achievement ProgressRing.
 *
 * Props:
 *   value      number   — fraction in [0, 1] that fills the ring
 *   centerText string   — big text in the middle (e.g. "62%")
 *   label      string   — small caption under the center text
 *   color      string   — token name: accent | free | success | error | text (default accent)
 *   size       number   — px diameter (default 96)
 */

const RING_COLOR = {
  accent:  'text-accent',
  free:    'text-free',
  success: 'text-success',
  error:   'text-error',
  text:    'text-text',
}

export default function StatRing({
  value = 0,
  centerText,
  label,
  color = 'accent',
  size = 96,
}) {
  const stroke = 6
  const r = (50 - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, value || 0))
  const offset = c * (1 - clamped)
  const colorClass = RING_COLOR[color] || RING_COLOR.accent

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 50 50" className="block">
        <circle
          cx="25" cy="25" r={r} fill="none" strokeWidth={stroke}
          stroke="currentColor" className="text-line" strokeOpacity="0.3"
        />
        <circle
          cx="25" cy="25" r={r} fill="none" strokeWidth={stroke}
          stroke="currentColor" strokeLinecap="round"
          className={colorClass}
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 25 25)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
        {centerText != null && (
          <div className={`font-display leading-none ${colorClass}`} style={{ fontSize: size * 0.26 }}>
            {centerText}
          </div>
        )}
        {label && (
          <div className="text-[9px] uppercase tracking-wide text-dim mt-1 leading-tight">
            {label}
          </div>
        )}
      </div>
    </div>
  )
}
