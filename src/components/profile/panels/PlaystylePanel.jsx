import { useState } from 'react'
import {
  Swords, Zap, Shield, Layers, Feather, AlertTriangle, Activity,
  Target, TrendingUp, ShieldCheck, Dices, Flame, Timer,
} from 'lucide-react'
import { AppSheet } from '../../ui-new'
import MeterTrack from '../../stats/MeterTrack'

const PCT = (n) => `${Math.round((n || 0) * 100)}%`

const STYLE_META = {
  Aggressor:    { icon: Swords,   color: 'text-success', bar: 'bg-success', bg: 'bg-success/15', desc: 'High spike share — relies on power and finishing.' },
  Server:       { icon: Zap,      color: 'text-accent',  bar: 'bg-accent',  bg: 'bg-accent/15',  desc: 'Strong serving — wins points off the line.' },
  Defender:     { icon: Shield,   color: 'text-free',    bar: 'bg-free',    bg: 'bg-free/15',    desc: 'Wall-and-dig — converts defense into points.' },
  Finesse:      { icon: Feather,  color: 'text-accent',  bar: 'bg-accent',  bg: 'bg-accent/15',  desc: 'Tip-dominant — wins with placement and touch.' },
  'All-rounder':{ icon: Layers,   color: 'text-text',    bar: 'bg-text',    bg: 'bg-alt',        desc: 'Balanced contribution across shot types.' },
}

const TRAIT_META = {
  clutch: {
    label: 'Clutch', icon: Target, color: 'text-success', bg: 'bg-success/15',
    desc: 'Ice in the veins. When the set is on the line, you win the big points.',
    how:  'Win 60%+ of the points you play in the final stretch of a set (20+ clutch points logged).',
  },
  comebackKid: {
    label: 'Comeback Kid', icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/15',
    desc: 'Never out of it. You do your best scoring when your team is behind.',
    how:  'Average 1.5+ comeback points per match, scored while trailing (5+ matches).',
  },
  safeHands: {
    label: 'Safe Hands', icon: ShieldCheck, color: 'text-success', bg: 'bg-success/15',
    desc: 'Mistakes? Barely. You almost never hand the other team free points.',
    how:  'Keep your error rate at 20% or below across 25+ shot attempts.',
  },
  gambler: {
    label: 'Gambler', icon: Dices, color: 'text-error', bg: 'bg-error/15',
    desc: 'High risk, high reward. You go for the bold shot and live with the misses.',
    how:  'An error rate of 40%+ across 25+ attempts — bold shot selection.',
  },
  workhorse: {
    label: 'Workhorse', icon: Flame, color: 'text-free', bg: 'bg-free/15',
    desc: 'The engine of the team. A huge share of the scoring runs through you.',
    how:  'Score 55%+ of your team’s points on average (5+ matches).',
  },
  metronome: {
    label: 'Metronome', icon: Timer, color: 'text-accent', bg: 'bg-accent/15',
    desc: 'Same player, every match. Your scoring output barely wavers.',
    how:  'Hold a consistency score of 0.85+ across 6+ matches.',
  },
}

export default function PlaystylePanel({ stats }) {
  const [openTrait, setOpenTrait] = useState(null)
  if (!stats || (stats.sampleSize || 0) < 3) return null
  const value = stats.value || {}
  const openMeta = openTrait ? TRAIT_META[openTrait] : null
  const OpenIcon = openMeta?.icon

  const meta = STYLE_META[value.label] || STYLE_META['All-rounder']
  const Icon = meta.icon

  // Per-match consistency mini-chart
  const matches = (value.consistencyByMatch || []).slice(-12) // last 12 matches
  const maxShare = Math.max(0.01, ...matches.map(m => m.share))
  const avgShare = matches.length
    ? matches.reduce((s, m) => s + m.share, 0) / matches.length
    : 0
  const peakShare = matches.length ? Math.max(...matches.map(m => m.share)) : 0

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

      {/* Trait chips */}
      {(value.traits?.length || 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {value.traits.map((id) => {
            const t = TRAIT_META[id]
            if (!t) return null
            const TIcon = t.icon
            return (
              <button
                key={id}
                type="button"
                onClick={() => setOpenTrait(id)}
                className={`inline-flex items-center gap-1 ${t.bg} ${t.color} rounded-full px-2 py-1 text-[10px] font-semibold border-0 cursor-pointer active:scale-95 transition-transform`}
              >
                <TIcon size={11} /> {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Trait detail sheet */}
      <AppSheet
        open={!!openMeta}
        onClose={() => setOpenTrait(null)}
        title={openMeta?.label}
      >
        {openMeta && (
          <div className="pb-1">
            <div className={`w-12 h-12 rounded-full ${openMeta.bg} flex items-center justify-center mx-auto mb-3`}>
              <OpenIcon size={22} className={openMeta.color} />
            </div>
            <div className="text-[13px] text-text text-center leading-snug mb-4">
              {openMeta.desc}
            </div>
            <div className="border-t border-line pt-3">
              <div className="text-[10px] uppercase tracking-wide text-dim mb-1">How you earn it</div>
              <div className="text-[12px] text-dim leading-snug">{openMeta.how}</div>
            </div>
          </div>
        )}
      </AppSheet>

      {/* Risk + consistency gauges */}
      <div className="space-y-2 mb-3">
        <MeterTrack
          title="Risk"
          icon={<AlertTriangle size={11} className="text-error" />}
          value={value.riskProfile}
          valueText={PCT(value.riskProfile)}
          leftLabel="Safe"
          rightLabel="Gambler"
          color="bg-text"
          gradient
        />
        <MeterTrack
          title="Consistency"
          icon={<Activity size={11} className="text-success" />}
          value={value.consistency}
          valueText={(value.consistency || 0).toFixed(2)}
          leftLabel="Streaky"
          rightLabel="Metronome"
          color="bg-success"
        />
      </div>

      {/* Mini bar chart of recent matches */}
      {matches.length > 0 && (
        <div className="bg-bg rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wide text-dim">
              Scoring share · last {matches.length}
            </div>
            <div className="text-[10px] text-dim">
              avg <span className="text-text font-semibold">{PCT(avgShare)}</span>
              {' · '}peak <span className="text-text font-semibold">{PCT(peakShare)}</span>
            </div>
          </div>
          {/* Bars share one reference frame with the average line */}
          <div className="relative flex items-end gap-1 h-[52px]">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-line z-10"
              style={{ bottom: `${(avgShare / maxShare) * 100}%` }}
            >
              <span className="absolute -top-2.5 right-0 text-[8px] text-dim bg-bg px-1">avg</span>
            </div>
            {matches.map((m, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${m.share > 0 ? meta.bar : 'bg-alt'}`}
                style={{ height: `${Math.max(4, (m.share / maxShare) * 100)}%` }}
                title={`${PCT(m.share)} (${m.points} pts)`}
              />
            ))}
          </div>
          {/* Points-per-match labels, aligned under each bar */}
          <div className="flex gap-1 mt-1">
            {matches.map((m, i) => (
              <span key={i} className="flex-1 text-center text-[8px] text-dim leading-none">
                {m.points}
              </span>
            ))}
          </div>
          <div className="text-[9px] text-dim mt-1 text-center">points scored per match</div>
        </div>
      )}
      {stats.sampleSize < stats.totalMatches && (
        <div className="text-[10px] text-dim mt-2">based on {stats.sampleSize} of {stats.totalMatches} matches</div>
      )}
    </div>
  )
}
