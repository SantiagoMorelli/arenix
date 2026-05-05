import { Flame, Hourglass, Shield, TrendingUp } from 'lucide-react'

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
  if (!stats || stats.clutchPlayed === 0) {
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
        <Headline value={PCT(stats.clutchWinPct)} label="Clutch win" colorClass="text-error" />
        <Headline value={PCT(stats.sideOutPct)} label="Side-out" colorClass="text-free" />
        <Headline
          value={`${stats.decidingSetWins}-${stats.decidingSetLosses}`}
          label="Deciders"
          colorClass="text-success"
        />
      </div>

      <StatRow
        icon={<Flame size={14} />}
        label="Clutch points"
        value={`${stats.clutchWon}W · ${stats.clutchLost}L`}
        sub={`${stats.clutchPlayed} total · last 4 of a set or deciding sets`}
        color="text-error"
      />
      <StatRow
        icon={<Shield size={14} />}
        label="Side-out conversion"
        value={`${stats.receivesWon}/${stats.receives}`}
        sub="Won rallies on receive"
        color="text-free"
      />
      <StatRow
        icon={<TrendingUp size={14} />}
        label="Comeback contribution"
        value={stats.comebackPoints}
        sub="Points scored while trailing 2+"
        color="text-accent"
      />
      <StatRow
        icon={<Hourglass size={14} />}
        label="Deciding sets"
        value={`${stats.decidingSetWins}-${stats.decidingSetLosses}`}
        sub={`${PCT(stats.decidingSetWinPct)} won when it goes the distance`}
        color="text-success"
      />
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
