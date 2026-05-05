import { Swords, Shield, Zap, Sparkles, AlertTriangle } from 'lucide-react'

const PCT = (n) => `${Math.round((n || 0) * 100)}%`

const SHOT_META = {
  ace:   { label: 'Aces',   icon: Zap,      color: 'bg-accent',  text: 'text-accent'  },
  spike: { label: 'Spikes', icon: Swords,   color: 'bg-success', text: 'text-success' },
  block: { label: 'Blocks', icon: Shield,   color: 'bg-free',    text: 'text-free'    },
  tip:   { label: 'Tips',   icon: Sparkles, color: 'bg-text/70', text: 'text-text'    },
}

const ERROR_LABEL = {
  net: 'Net', out: 'Out', serve: 'Serve', other: 'Other', untyped: 'Unspecified',
}

export default function StrengthsPanel({ stats }) {
  if (!stats || (stats.totalScoring === 0 && stats.totalErrors === 0)) {
    return (
      <div className="text-center text-[12px] text-dim py-6">
        No scoring data yet.
      </div>
    )
  }

  const total = stats.totalScoring || 1
  const shots = ['ace', 'spike', 'block', 'tip'].map(k => ({
    key: k,
    count: stats.byType[k] || 0,
    share: (stats.byType[k] || 0) / total,
    meta: SHOT_META[k],
  }))

  // Error breakdown share
  const errorTotal = stats.totalErrors || 1
  const errorEntries = Object.entries(stats.errorsByType || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  return (
    <div>
      {/* Top shot callout */}
      {stats.topShot && (
        <div className="bg-bg rounded-xl p-3 mb-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${SHOT_META[stats.topShot]?.color || 'bg-accent'} flex items-center justify-center`}>
            {(() => {
              const Icon = SHOT_META[stats.topShot]?.icon || Zap
              return <Icon size={18} className="text-white" />
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-dim">Top shot</div>
            <div className="text-[16px] font-bold text-text">
              {SHOT_META[stats.topShot]?.label || stats.topShot}
            </div>
          </div>
          <div className={`font-display ${SHOT_META[stats.topShot]?.text || 'text-accent'}`} style={{ fontSize: 22 }}>
            {PCT(stats.topShotShare)}
          </div>
        </div>
      )}

      {/* Shot distribution */}
      <div className="space-y-2 mb-3">
        {shots.map(s => (
          <div key={s.key}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[11px] text-text">{s.meta.label}</span>
              <span className="text-[11px] text-dim">
                {s.count} <span className="text-dim/70">· {PCT(s.share)}</span>
              </span>
            </div>
            <div className="h-[5px] bg-alt rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${s.meta.color}`}
                style={{ width: `${Math.round(s.share * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Errors */}
      {errorEntries.length > 0 && (
        <div className="bg-bg rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={12} className="text-error" />
            <div className="text-[10px] uppercase tracking-wide text-dim">
              Error breakdown <span className="text-text font-bold">· {stats.totalErrors}</span>
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
    </div>
  )
}
