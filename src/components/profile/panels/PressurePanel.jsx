import { Flame, Hourglass, Shield, TrendingUp, AlertTriangle } from 'lucide-react'

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

export default function PressurePanel({ stats }) {
  if (!stats || (stats.sampleSize || 0) < 3) return null
  const value = stats.value || {}
  if (value.clutchPlayed === 0) {
    return (
      <div className="text-center text-[12px] text-dim py-6">
        Not enough close-game data yet.
      </div>
    )
  }

  return (
    <div>
      {/* Headline */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Headline value={PCT(value.clutchWinPct)} label="Clutch win" colorClass="text-error" />
        <Headline value={PCT(value.sideOutPct)} label="Side-out" colorClass="text-free" />
        <Headline
          value={`${value.decidingSetWins}-${value.decidingSetLosses}`}
          label="Deciders"
          colorClass="text-success"
        />
      </div>

      <StatRow
        icon={<Flame size={14} />}
        label="Clutch points"
        value={`${value.clutchWon}W · ${value.clutchLost}L`}
        sub={`${value.clutchPlayed} total · last 4 of a set or deciding sets`}
        color="text-error"
      />
      <StatRow
        icon={<AlertTriangle size={14} />}
        label="Clutch mistakes"
        value={`${value.clutchErrors}`}
        sub={`Errors made when margin <= 2`}
        color="text-error"
      />
      <StatRow
        icon={<AlertTriangle size={14} className="text-dim" />}
        label="Late-game errors"
        value={`${value.fatigueErrors}`}
        sub={`Errors made when score >= 15`}
        color="text-text"
      />
      <StatRow
        icon={<Shield size={14} />}
        label="Side-out conversion"
        value={`${value.receivesWon}/${value.receives}`}
        sub="Won rallies on receive"
        color="text-free"
      />
      <StatRow
        icon={<TrendingUp size={14} />}
        label="Comeback contribution"
        value={value.comebackPoints}
        sub="Points scored while trailing 2+"
        color="text-accent"
      />
      <StatRow
        icon={<Hourglass size={14} />}
        label="Deciding sets"
        value={`${value.decidingSetWins}-${value.decidingSetLosses}`}
        sub={`${PCT(value.decidingSetWinPct)} won when it goes the distance`}
        color="text-success"
      />
      {stats.sampleSize < stats.totalMatches && (
        <div className="text-[10px] text-dim mt-2">based on {stats.sampleSize} of {stats.totalMatches} matches</div>
      )}
    </div>
  )
}

function Headline({ value, label, colorClass }) {
  return (
    <div className="bg-bg rounded-lg py-2 text-center">
      <div className={`font-display leading-none ${colorClass}`} style={{ fontSize: 18 }}>
        {value}
      </div>
      <div className="text-[9px] text-dim mt-1 uppercase tracking-wide">{label}</div>
    </div>
  )
}
