import { Swords, Shield, Zap, Sparkles, AlertTriangle } from 'lucide-react'

const PCT = (n) => `${Math.round((n || 0) * 100)}%`

const SHOT_META = {
  ace:   { label: 'Aces',   icon: Zap,      color: 'bg-accent',  text: 'text-accent'  },
  spike: { label: 'Spikes', icon: Swords,   color: 'bg-success', text: 'text-success' },
  block: { label: 'Blocks', icon: Shield,   color: 'bg-free',    text: 'text-free'    },
  tip:   { label: 'Tips',   icon: Sparkles, color: 'bg-text/70', text: 'text-text'    },
}

const ERROR_LABEL = {
  spike: 'Spike', tip: 'Tip', serve: 'Serve', other: 'Other', untyped: 'Unspecified',
}

export default function StrengthsPanel({ stats }) {
  if (!stats || (stats.sampleSize || 0) < 3) return null
  const value = stats.value || {}
  if (value.totalScoring === 0 && value.totalErrors === 0) {
    return (
      <div className="text-center text-[12px] text-dim py-6">
        No scoring data yet.
      </div>
    )
  }

  const total = value.totalScoring || 1
  const shots = ['ace', 'spike', 'block', 'tip'].map(k => ({
    key: k,
    count: value.byType[k] || 0,
    share: (value.byType[k] || 0) / total,
    meta: SHOT_META[k],
  }))

  // Error breakdown share
  const errorTotal = value.totalErrors || 1
  const errorEntries = Object.entries(value.errorsByType || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  return (
    <div>
      {/* Top shot callout */}
      {value.topShot && (
        <div className="bg-bg rounded-xl p-3 mb-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${SHOT_META[value.topShot]?.color || 'bg-accent'} flex items-center justify-center`}>
            {(() => {
              const Icon = SHOT_META[value.topShot]?.icon || Zap
              return <Icon size={18} className="text-white" />
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-dim">Top shot</div>
            <div className="text-[16px] font-bold text-text">
              {SHOT_META[value.topShot]?.label || value.topShot}
            </div>
          </div>
          <div className={`font-display ${SHOT_META[value.topShot]?.text || 'text-accent'}`} style={{ fontSize: 22 }}>
            {PCT(value.topShotShare)}
          </div>
        </div>
      )}

      {/* Shot distribution and Action Efficiency */}
      <div className="space-y-4 mb-4">
        {shots.map(s => {
          const actionEffPct = (s.count + (value.errorsByType[s.key] || 0)) > 0
            ? PCT(s.count / (s.count + (value.errorsByType[s.key] || 0)))
            : null;

          return (
            <div key={s.key}>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[11px] text-text flex items-center gap-1.5">
                  <s.meta.icon size={11} className={s.meta.text} />
                  {s.meta.label}
                  {actionEffPct && (s.key === 'spike' || s.key === 'tip') && (
                    <span className="ml-1 text-[9px] bg-alt px-1.5 py-0.5 rounded text-dim">
                      {actionEffPct} kill
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-dim">
                  {s.count} <span className="text-dim/70">· {PCT(s.share)}</span>
                </span>
              </div>
              <div className="h-[5px] bg-alt rounded-full overflow-hidden flex">
                <div
                  className={`h-full ${s.meta.color}`}
                  style={{ width: `${Math.round(s.share * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Errors */}
      {errorEntries.length > 0 && (
        <div className="bg-bg rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={12} className="text-error" />
              <div className="text-[10px] uppercase tracking-wide text-dim">
                Error breakdown <span className="text-text font-bold">· {value.totalErrors}</span>
              </div>
            </div>
          <div className="space-y-1.5">
            {errorEntries.map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span className="text-[11px] text-text">{ERROR_LABEL[k] || k}</span>
                <span className="text-[11px] text-dim">
                  {v} <span className="text-dim/70">· {PCT(v / errorTotal)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {stats.sampleSize < stats.totalMatches && (
        <div className="text-[10px] text-dim mt-2">based on {stats.sampleSize} of {stats.totalMatches} matches</div>
      )}
    </div>
  )
}
