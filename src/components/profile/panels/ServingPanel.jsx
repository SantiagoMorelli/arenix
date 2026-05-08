import { Zap, AlertTriangle, Target, Flame } from 'lucide-react'

const PCT = (n) => `${Math.round((n || 0) * 100)}%`

function StatRow({ icon, label, value, sub, color = 'text-text' }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-line last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-alt flex items-center justify-center flex-shrink-0 text-dim">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-text">{label}</div>
        {sub && <div className="text-[10px] text-dim">{sub}</div>}
      </div>
      <div className={`font-display text-[20px] leading-none ${color}`}>
        {value}
      </div>
    </div>
  )
}

function MiniBar({ pct, color }) {
  return (
    <div className="h-[5px] bg-alt rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.round((pct || 0) * 100)}%` }}
      />
    </div>
  )
}

export default function ServingPanel({ stats }) {
  if (!stats || (stats.sampleSize || 0) < 3) return null
  const value = stats.value || {}
  if (value.totalServes === 0) {
    return (
      <div className="text-center text-[12px] text-dim py-6">
        No serves recorded yet.
      </div>
    )
  }

  return (
    <div>
      {/* Headline numbers */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Headline value={value.totalServes} label="Serves" colorClass="text-text" />
        <Headline value={PCT(value.serveWinPct)} label="Serve win" colorClass="text-success" />
        <Headline value={PCT(value.serveInPlayPct)} label="In play" colorClass="text-free" />
      </div>

      {/* Bars for visual context */}
      <div className="space-y-2 mb-3">
        <BarRow label="Serve win %" value={PCT(value.serveWinPct)} pct={value.serveWinPct} color="bg-success" />
        <BarRow label="In play %"   value={PCT(value.serveInPlayPct)} pct={value.serveInPlayPct} color="bg-free" />
        <BarRow label="Ace rate"    value={PCT(value.aceRate)} pct={value.aceRate} color="bg-accent" />
        <BarRow label="Error rate"  value={PCT(value.errorRate)} pct={value.errorRate} color="bg-error" />
      </div>

      <StatRow icon={<Zap size={14} />} label="Aces" value={value.aces} sub="Successful service points" color="text-accent" />
      <StatRow icon={<AlertTriangle size={14} />} label="Serve errors" value={value.serveErrors} sub="Net, out, foot fault, etc." color="text-error" />
      <StatRow icon={<Flame size={14} />} label="Longest run" value={value.longestServingRun} sub="Consecutive points won serving" color="text-text" />
      {value.bestSet && (
        <StatRow
          icon={<Target size={14} />}
          label="Best serving set"
          value={`${value.bestSet.wins}/${value.bestSet.serves}`}
          sub={`Set ${value.bestSet.setNum} · ${PCT(value.bestSet.serveWinPct)} win`}
          color="text-success"
        />
      )}
      {stats.sampleSize < stats.totalMatches && (
        <div className="text-[10px] text-dim mt-2">based on {stats.sampleSize} of {stats.totalMatches} matches</div>
      )}
    </div>
  )
}

function Headline({ value, label, colorClass }) {
  return (
    <div className="bg-bg rounded-lg py-2 text-center">
      <div className={`font-display leading-none ${colorClass}`} style={{ fontSize: 20 }}>
        {value}
      </div>
      <div className="text-[9px] text-dim mt-1 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function BarRow({ label, value, pct, color }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[11px] text-dim">{label}</span>
        <span className="text-[11px] font-bold text-text">{value}</span>
      </div>
      <MiniBar pct={pct} color={color} />
    </div>
  )
}
