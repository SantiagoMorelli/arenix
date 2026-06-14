import { Hourglass, TrendingUp, AlertTriangle } from 'lucide-react'
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

function SectionTitle({ children }) {
  return (
    <div className="text-[10px] uppercase tracking-wide text-dim mb-2">{children}</div>
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
      {/* Big points — won vs lost when the set is on the line */}
      <div className="bg-bg rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2.5">
          <SectionTitle>Big points</SectionTitle>
          <div className="font-display text-[20px] text-success leading-none">
            {PCT(value.clutchWinPct)} <span className="text-[10px] text-dim font-sans">won</span>
          </div>
        </div>
        <SplitBar
          segments={[
            { value: value.clutchWon || 0,  color: 'bg-success', label: 'Won' },
            { value: value.clutchLost || 0, color: 'bg-error',   label: 'Lost' },
          ]}
        />
        <div className="text-[10px] text-dim mt-2">
          {value.clutchPlayed} big points — the last few of a tight set & deciders
        </div>
      </div>

      {/* Receiving — how often you win the rally after the other team serves */}
      <div className="bg-bg rounded-xl p-3 mb-3 flex items-center gap-4">
        <StatRing
          value={value.sideOutPct}
          centerText={PCT(value.sideOutPct)}
          label="Receive"
          color="free"
          size={84}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-text font-semibold mb-0.5">Rallies won on receive</div>
          <div className="text-[11px] text-dim leading-snug">
            You won <span className="text-text font-semibold">{value.receivesWon}</span> of{' '}
            <span className="text-text font-semibold">{value.receives}</span> rallies when the
            other team was serving. Winning these flips the serve to your side.
          </div>
        </div>
      </div>

      {/* Supporting facts, in plain English */}
      <StatRow
        icon={<TrendingUp size={14} />}
        label="Points won while trailing"
        value={value.comebackPoints}
        sub="Scored when your team was down 2+"
        color="text-accent"
      />
      <StatRow
        icon={<AlertTriangle size={14} />}
        label="Mistakes under pressure"
        value={value.clutchErrors}
        sub="Errors made while the score was within 2"
        color="text-error"
      />
      <StatRow
        icon={<AlertTriangle size={14} className="text-dim" />}
        label="Late-game mistakes"
        value={value.fatigueErrors}
        sub="Errors made once a set reached 15+"
        color="text-text"
      />
      <StatRow
        icon={<Hourglass size={14} />}
        label="Deciding-set record"
        value={`${value.decidingSetWins}-${value.decidingSetLosses}`}
        sub={`${PCT(value.decidingSetWinPct)} won when a match goes the distance`}
        color="text-success"
      />
      {stats.sampleSize < stats.totalMatches && (
        <div className="text-[10px] text-dim mt-2">based on {stats.sampleSize} of {stats.totalMatches} matches</div>
      )}
    </div>
  )
}
