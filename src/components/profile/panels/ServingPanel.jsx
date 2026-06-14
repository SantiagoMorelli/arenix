import { Zap, AlertTriangle, Target, Flame } from 'lucide-react'
import StatRing from '../../stats/StatRing'
import SplitBar from '../../stats/SplitBar'

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

  // Every serve falls into exactly one outcome bucket (these sum to totalServes).
  const wonNonAce = Math.max(0, (value.serveWins || 0) - (value.aces || 0))
  const inPlayLost = Math.max(
    0,
    (value.totalServes || 0) - (value.serveErrors || 0) - (value.serveWins || 0),
  )
  const outcomeSegments = [
    { value: value.aces || 0,        color: 'bg-accent',  label: 'Aces' },
    { value: wonNonAce,              color: 'bg-success', label: 'Won' },
    { value: inPlayLost,             color: 'bg-free',    label: 'In play, lost' },
    { value: value.serveErrors || 0, color: 'bg-error',   label: 'Errors' },
  ]

  return (
    <div>
      {/* Hero: serve-win ring + where the serves go */}
      <div className="bg-bg rounded-xl p-3 mb-3 flex items-center gap-4">
        <StatRing
          value={value.serveWinPct}
          centerText={PCT(value.serveWinPct)}
          label="Serve win"
          color="success"
          size={92}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-dim mb-1">
            {value.totalServes} serves · where they went
          </div>
          <SplitBar segments={outcomeSegments} />
        </div>
      </div>

      <StatRow icon={<Zap size={14} />} label="Aces" value={value.aces} sub="Untouched service winners" color="text-accent" />
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
