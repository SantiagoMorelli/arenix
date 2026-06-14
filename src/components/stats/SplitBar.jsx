/**
 * One horizontal bar divided into colored segments that sum to 100%, with an
 * optional legend underneath. Pure Tailwind, tokens-only — matches the existing
 * stacked-bar look used elsewhere in the stats screens.
 *
 * Props:
 *   segments  Array<{ value: number, color: string, label?: string }>
 *             — `value` is a raw count (widths are normalized to the total);
 *               `color` is a bg-* token class (e.g. 'bg-success');
 *               `label` is shown in the legend.
 *   legend    boolean  — render the legend row (default true)
 *   height    string   — Tailwind height class for the bar (default 'h-[8px]')
 *   minPct    number   — minimum visible width % for any non-zero segment (default 2)
 */
export default function SplitBar({
  segments = [],
  legend = true,
  height = 'h-[8px]',
  minPct = 2,
}) {
  const total = segments.reduce((s, seg) => s + Math.max(0, seg.value || 0), 0)

  return (
    <div>
      <div className={`${height} bg-alt rounded-full overflow-hidden flex`}>
        {total > 0 &&
          segments.map((seg, i) => {
            const v = Math.max(0, seg.value || 0)
            if (v === 0) return null
            const pct = Math.max(minPct, (v / total) * 100)
            return (
              <div
                key={i}
                className={`h-full ${seg.color}`}
                style={{ width: `${pct}%` }}
                title={seg.label ? `${seg.label}: ${v}` : `${v}`}
              />
            )
          })}
      </div>
      {legend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-sm ${seg.color}`} />
              <span className="text-[10px] text-dim">
                {seg.label}
                {' '}
                <span className="text-text font-semibold">{Math.max(0, seg.value || 0)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
