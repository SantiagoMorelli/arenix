/**
 * A labeled spectrum gauge: a horizontal track with a pole label at each end and
 * a marker positioned by `value`. Reads as "where do you fall between two
 * extremes". Pure Tailwind, tokens-only.
 *
 * Props:
 *   value       number  — fraction in [0, 1]; 0 sits at the left pole, 1 at the right
 *   leftLabel   string  — caption under the left end (the "low" pole)
 *   rightLabel  string  — caption under the right end (the "high" pole)
 *   valueText   string  — text shown in/above the marker (e.g. "32%" or "0.78")
 *   color       string  — bg-* token for the marker (default 'bg-text')
 *   gradient    boolean — tint the track success→error left to right (default false)
 *   icon        node    — optional small icon shown next to the title
 *   title       string  — small uppercase label above the track
 */
export default function MeterTrack({
  value = 0,
  leftLabel,
  rightLabel,
  valueText,
  color = 'bg-text',
  gradient = false,
  icon,
  title,
}) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100

  return (
    <div className="bg-bg rounded-xl p-3">
      {(title || valueText) && (
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-dim">
            {icon}
            {title}
          </div>
          {valueText != null && (
            <div className="font-display text-[16px] text-text leading-none">{valueText}</div>
          )}
        </div>
      )}

      {/* Track + marker */}
      <div className="relative h-[6px] rounded-full bg-alt">
        {gradient && (
          <div className="absolute inset-0 rounded-full opacity-80 bg-gradient-to-r from-success via-accent to-error" />
        )}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pct}%` }}
        >
          <span className={`block w-3.5 h-3.5 rounded-full border-2 border-surface ${color} shadow`} />
        </div>
      </div>

      <div className="flex justify-between mt-2 text-[9px] uppercase tracking-wide text-dim">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}
