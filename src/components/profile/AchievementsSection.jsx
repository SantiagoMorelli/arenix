/**
 * Achievements grid with category filter chips, progress rings on locked
 * badges, and a pop animation on the recently-unlocked badge.
 *
 * Default filter: 'milestones' (avoids overwhelming the user with all 18
 * badges at once on first load).
 *
 * Help toggle: same pattern as GameStats — a ? button next to the section
 * header expands an InfoPanel explaining how achievements work.
 */
import { useState } from 'react'
import {
  Award, Crown, Flame, Globe, Hourglass, PlayCircle, Repeat, Rocket,
  Shield, ShieldCheck, Sparkles, Swords, Target, TrendingUp, Trophy,
  Users, Volume2, VolumeX, Zap,
} from 'lucide-react'
import { SectionLabel } from '../ui-new'
import { HelpToggle, InfoPanel } from '../stats/StatInfo'
import { CATEGORIES, summarizeByCategory } from '../../lib/achievements'
import { isSoundOn, setSoundOn } from '../../lib/chime'
import { PROFILE_EXPLANATIONS } from './profileExplanations'

const ICONS = {
  Award, Crown, Flame, Globe, Hourglass, PlayCircle, Repeat, Rocket,
  Shield, ShieldCheck, Sparkles, Swords, Target, TrendingUp, Trophy,
  Users, Zap,
}

const COLOR_CLASSES = {
  accent:  { ring: 'border-accent/60',  bg: 'bg-accent/15',  text: 'text-accent'  },
  free:    { ring: 'border-free/60',    bg: 'bg-free/15',    text: 'text-free'    },
  success: { ring: 'border-success/60', bg: 'bg-success/15', text: 'text-success' },
  error:   { ring: 'border-error/60',   bg: 'bg-error/15',   text: 'text-error'   },
}

const CONFETTI_VECTORS = [
  { dx: 28,  dy: -34 },
  { dx: -28, dy: -34 },
  { dx: 36,  dy: -8  },
  { dx: -36, dy: -8  },
  { dx: 16,  dy: -42 },
  { dx: -16, dy: -42 },
]

function ProgressRing({ value, color }) {
  const r = 22
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(1, value || 0)))
  const colorClass = COLOR_CLASSES[color]?.text || 'text-accent'
  return (
    <svg
      width="50" height="50" viewBox="0 0 50 50"
      className="absolute inset-0 m-auto pointer-events-none"
    >
      <circle cx="25" cy="25" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" className="text-line" />
      <circle
        cx="25" cy="25" r={r} fill="none" strokeWidth="2"
        stroke="currentColor" strokeLinecap="round"
        className={colorClass}
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 25 25)"
      />
    </svg>
  )
}

function Badge({ achievement, isPopping }) {
  const Icon = ICONS[achievement.icon] || Award
  const colorClass = COLOR_CLASSES[achievement.color] || COLOR_CLASSES.accent
  const locked = !achievement.unlocked

  return (
    <div
      className={`
        relative bg-surface border rounded-[12px] py-3 px-1.5 text-center
        transition-all
        ${locked ? 'border-line opacity-50 grayscale' : `border ${colorClass.ring}`}
        ${isPopping ? 'animate-unlock-pop' : ''}
      `}
    >
      <div className="relative w-[50px] h-[50px] mx-auto mb-1.5 flex items-center justify-center">
        {locked && achievement.progressValue > 0 && (
          <ProgressRing value={achievement.progressValue} color={achievement.color} />
        )}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${locked ? 'bg-alt' : colorClass.bg}`}>
          <Icon size={18} className={locked ? 'text-dim' : colorClass.text} />
        </div>

        {/* Confetti — rendered only while popping */}
        {isPopping && CONFETTI_VECTORS.map((v, i) => (
          <span
            key={i}
            className="confetti-dot pointer-events-none absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-accent"
            style={{
              ['--dx']: `${v.dx}px`,
              ['--dy']: `${v.dy}px`,
              animationDelay: `${i * 30}ms`,
            }}
          />
        ))}
      </div>
      <div className="text-[10px] font-semibold text-text leading-tight px-0.5">{achievement.name}</div>
    </div>
  )
}

export default function AchievementsSection({ achievements, recentlyUnlockedId }) {
  // Default to 'milestones' so landing on profile doesn't show all 18 badges.
  const [filter, setFilter] = useState('milestones')
  const [soundOn, setLocalSoundOn] = useState(isSoundOn())
  const [helpOpen, setHelpOpen] = useState(false)

  const summary = summarizeByCategory(achievements || [])
  const filtered = (achievements || []).filter(
    a => filter === 'all' || a.category === filter
  )

  const totalUnlocked = (achievements || []).filter(a => a.unlocked).length
  const total = (achievements || []).length

  function toggleSound() {
    const next = !soundOn
    setLocalSoundOn(next)
    setSoundOn(next)
  }

  return (
    <div className="mb-4">
      {/* Header row: label + ? toggle + sound toggle */}
      <div className="flex items-center justify-between mb-0">
        <SectionLabel color="accent">
          Achievements <span className="text-dim font-normal">· {totalUnlocked}/{total}</span>
        </SectionLabel>
        <div className="flex items-center gap-0.5 -mt-1.5">
          <HelpToggle on={helpOpen} onChange={setHelpOpen} />
          <button
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute unlock sound' : 'Unmute unlock sound'}
            className="text-dim cursor-pointer bg-transparent border-0 p-1 w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:text-text"
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </div>

      {/* Explanation panel */}
      <InfoPanel open={helpOpen}>
        {PROFILE_EXPLANATIONS.achievements}
      </InfoPanel>

      {/* Category chips */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto snap-x snap-mandatory pb-0.5 mt-2.5">
        <CategoryChip id="all" label="All" total={total} unlocked={totalUnlocked}
          active={filter === 'all'} onClick={() => setFilter('all')} />
        {CATEGORIES.map(c => {
          const s = summary.find(x => x.id === c.id) || { unlocked: 0, total: 0 }
          return (
            <CategoryChip key={c.id} id={c.id} label={c.label}
              total={s.total} unlocked={s.unlocked}
              active={filter === c.id} onClick={() => setFilter(c.id)} />
          )
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {filtered.map(a => (
          <Badge
            key={a.id}
            achievement={a}
            isPopping={recentlyUnlockedId === a.id}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryChip({ label, total, unlocked, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 snap-start px-2.5 py-1 rounded-full
        text-[11px] font-semibold whitespace-nowrap
        cursor-pointer border transition-colors
        ${active
          ? 'bg-accent text-white border-accent'
          : 'bg-surface text-dim border-line'}
      `}
    >
      {label} <span className={active ? 'opacity-90' : 'opacity-60'}>· {unlocked}/{total}</span>
    </button>
  )
}
