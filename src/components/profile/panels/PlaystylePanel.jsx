import { Swords, Zap, Shield, Layers, AlertTriangle, Activity } from 'lucide-react'

const PCT = (n) => `${Math.round((n || 0) * 100)}%`

const STYLE_META = {
  Aggressor:    { icon: Swords,   color: 'text-success', bar: 'bg-success', bg: 'bg-success/15', desc: 'High spike share — relies on power and finishing.' },
  Server:       { icon: Zap,      color: 'text-accent',  bar: 'bg-accent',  bg: 'bg-accent/15',  desc: 'Strong serving — wins points off the line.' },
  Defender:     { icon: Shield,   color: 'text-free',    bar: 'bg-free',    bg: 'bg-free/15',    desc: 'Wall-and-dig — converts defense into points.' },
  'All-rounder':{ icon: Layers,   color: 'text-text',    bar: 'bg-text',    bg: 'bg-alt',        desc: 'Balanced contribution across shot types.' },
}

export default function PlaystylePanel({ stats }) {
  if (!stats || (stats.sampleSize || 0) < 3) return null
  const value = stats.value || {}

  const meta = STYLE_META[value.label] || STYLE_META['All-rounder']
  const Icon = meta.icon

  // Per-match consistency mini-chart
  const matches = (value.consistencyByMatch || []).slice(-12) // last 12 matches
  const maxShare = Math.max(0.01, ...matches.map(m => m.share))

  return (
    <div>
      {/* Style label */}
      <div className={`${meta.bg} rounded-xl p-3 mb-3 flex items-center gap-3`}>
        <div className={`w-10 h-10 rounded-full bg-surface flex items-center justify-center`}>
          <Icon size={18} className={meta.color} />
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wide text-dim">Profile</div>
          <div className={`text-[18px] font-bold ${meta.color}`}>{value.label}</div>
          <div className="text-[10px] text-dim mt-0.5">{meta.desc}</div>
        </div>
      </div>

      {/* Risk + consistency */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-bg rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-error" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-dim uppercase tracking-wide">Risk</div>
              <div className="font-display text-[18px] text-error leading-none">
                {PCT(value.riskProfile)}
              </div>
            <div className="text-[9px] text-dim mt-0.5">errors / attempts</div>
          </div>
        </div>
        <div className="bg-bg rounded-xl p-3 flex items-center gap-2">
          <Activity size={14} className="text-success" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-dim uppercase tracking-wide">Consistency</div>
              <div className="font-display text-[18px] text-success leading-none">
                {(value.consistency || 0).toFixed(2)}
              </div>
            <div className="text-[9px] text-dim mt-0.5">1.0 = identical share</div>
          </div>
        </div>
      </div>

      {/* Mini bar chart of recent matches */}
      {matches.length > 0 && (
        <div className="bg-bg rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wide text-dim mb-2">
            Scoring share (last {matches.length} matches)
          </div>
          <div className="flex items-end gap-1 h-[48px]">
            {matches.map((m, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${m.share > 0 ? meta.bar : 'bg-alt'}`}
                style={{ height: `${Math.max(4, (m.share / maxShare) * 100)}%` }}
                title={`${PCT(m.share)} (${m.points} pts)`}
              />
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
