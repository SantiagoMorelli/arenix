import { Swords, Shield, Zap, Sparkles, AlertTriangle } from 'lucide-react'
import SplitBar from '../../stats/SplitBar'

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

// Attacking shots that have a matching error bucket → show kills vs mistakes.
const ATTACK_SHOTS = new Set(['spike', 'tip'])

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
    errors: (value.errorsByType || {})[k] || 0,
    share: (value.byType[k] || 0) / total,
    meta: SHOT_META[k],
  }))

  // Error breakdown share
  const errorEntries = Object.entries(value.errorsByType || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
  const errorMax = Math.max(1, ...errorEntries.map(([, v]) => v))

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

      {/* Shot distribution. Attacking shots show kills vs mistakes (efficiency). */}
      <div className="space-y-4 mb-4">
        {shots.map(s => {
          const attempts = s.count + s.errors
          const isAttack = ATTACK_SHOTS.has(s.key)
          const killPct = isAttack && attempts > 0 ? s.count / attempts : null

          return (
            <div key={s.key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-text flex items-center gap-1.5">
                  <s.meta.icon size={11} className={s.meta.text} />
                  {s.meta.label}
                </span>
                <span className="text-[11px] text-dim">
                  {s.count} <span className="text-dim/70">· {PCT(s.share)}</span>
                </span>
              </div>

              {isAttack && attempts > 0 ? (
                <>
                  <SplitBar
                    height="h-[7px]"
                    legend={false}
                    segments={[
                      { value: s.count,  color: s.meta.color, label: 'Kills' },
                      { value: s.errors, color: 'bg-error',    label: 'Mistakes' },
                    ]}
                  />
                  <div className="flex justify-between items-center mt-1 text-[10px] text-dim">
                    <span>
                      <span className={`font-semibold ${s.meta.text}`}>{s.count}</span> kills ·{' '}
                      <span className="font-semibold text-error">{s.errors}</span> mistakes
                    </span>
                    <span className="font-semibold text-text">{PCT(killPct)} kill</span>
                  </div>
                </>
              ) : (
                <div className="h-[5px] bg-alt rounded-full overflow-hidden flex">
                  <div
                    className={`h-full ${s.meta.color}`}
                    style={{ width: `${Math.round(s.share * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Errors — visual bars */}
      {errorEntries.length > 0 && (
        <div className="bg-bg rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle size={12} className="text-error" />
            <div className="text-[10px] uppercase tracking-wide text-dim">
              Error breakdown <span className="text-text font-bold">· {value.totalErrors}</span>
            </div>
          </div>
          <div className="space-y-2">
            {errorEntries.map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[11px] text-text">{ERROR_LABEL[k] || k}</span>
                  <span className="text-[11px] text-dim">
                    {v} <span className="text-dim/70">· {PCT(v / (value.totalErrors || 1))}</span>
                  </span>
                </div>
                <div className="h-[5px] bg-alt rounded-full overflow-hidden">
                  <div
                    className="h-full bg-error/80 rounded-full"
                    style={{ width: `${Math.round((v / errorMax) * 100)}%` }}
                  />
                </div>
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
