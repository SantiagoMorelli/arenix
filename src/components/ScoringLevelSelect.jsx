const LEVELS = [
  { value: 1, title: '1 — Basic',        sub: 'Team points only' },
  { value: 2, title: '2 — Intermediate', sub: '+ Scoring player' },
  { value: 3, title: '3 — Detailed',     sub: '+ Point category, errors & server' },
]

/**
 * Props:
 *   value        number | null  — selected level (null = inherit)
 *   onChange     fn(value)
 *   showInherit  boolean        — prepend an "Inherit from league" option
 */
export default function ScoringLevelSelect({ value, onChange, showInherit = false }) {
  const options = showInherit
    ? [{ value: null, title: 'Inherit from league', sub: 'Use the league default' }, ...LEVELS]
    : LEVELS

  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer text-left transition-colors ${
              active ? 'border-accent bg-accent/10' : 'border-line bg-surface'
            }`}
          >
            <div className="flex-1">
              <div className={`text-[14px] font-bold leading-tight ${active ? 'text-accent' : 'text-text'}`}>
                {opt.title}
              </div>
              <div className="text-[11px] text-dim mt-0.5">{opt.sub}</div>
            </div>
            {active && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
