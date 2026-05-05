/**
 * AchievementDetailSheet
 *
 * Bottom sheet that opens when the user taps any achievement badge.
 * Shows the icon (large, full-color if unlocked / greyed if locked),
 * the name, category, description, a progress bar with current/goal
 * numbers, and a plain-English hint explaining exactly how to unlock it.
 */
import {
  Award, Crown, Flame, Globe, Hourglass, PlayCircle, Repeat, Rocket,
  Shield, ShieldCheck, Sparkles, Swords, Target, TrendingUp, Trophy,
  Users, Zap, CheckCircle2,
} from 'lucide-react'
import { AppSheet } from '../ui-new'
import { CATEGORIES } from '../../lib/achievements'

const ICONS = {
  Award, Crown, Flame, Globe, Hourglass, PlayCircle, Repeat, Rocket,
  Shield, ShieldCheck, Sparkles, Swords, Target, TrendingUp, Trophy,
  Users, Zap,
}

const COLOR = {
  accent:  { ring: 'border-accent/60',  bg: 'bg-accent/15',  text: 'text-accent',  bar: 'bg-accent'  },
  free:    { ring: 'border-free/60',    bg: 'bg-free/15',    text: 'text-free',    bar: 'bg-free'    },
  success: { ring: 'border-success/60', bg: 'bg-success/15', text: 'text-success', bar: 'bg-success' },
  error:   { ring: 'border-error/60',   bg: 'bg-error/15',   text: 'text-error',   bar: 'bg-error'   },
}

export default function AchievementDetailSheet({ achievement, open, onClose }) {
  if (!achievement) return null

  const Icon     = ICONS[achievement.icon] || Award
  const c        = COLOR[achievement.color] || COLOR.accent
  const locked   = !achievement.unlocked
  const pct      = Math.round((achievement.progressValue || 0) * 100)
  const category = CATEGORIES.find(x => x.id === achievement.category)

  // Compute current stat value for the progress label
  const current = achievement.goal != null
    ? Math.min(achievement.goal, Math.round((achievement.progressValue || 0) * achievement.goal))
    : null

  return (
    <AppSheet open={open} onClose={onClose} title={achievement.name}>
      {/* Big icon */}
      <div className="flex flex-col items-center mb-5 mt-1">
        <div
          className={`
            w-20 h-20 rounded-2xl flex items-center justify-center mb-3 border-2
            ${locked ? 'bg-alt border-line grayscale opacity-50' : `${c.bg} ${c.ring}`}
          `}
        >
          <Icon size={36} className={locked ? 'text-dim' : c.text} />
        </div>

        {/* Unlocked badge */}
        {!locked && (
          <div className={`flex items-center gap-1 ${c.text} text-[11px] font-bold mb-1`}>
            <CheckCircle2 size={13} />
            Unlocked
          </div>
        )}

        {/* Category chip */}
        {category && (
          <span className="text-[10px] font-semibold text-dim bg-alt px-2.5 py-1 rounded-full">
            {category.label}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="text-[13px] text-text font-semibold text-center mb-4 px-2 leading-snug">
        {achievement.description}
      </div>

      {/* Progress bar */}
      {achievement.goal != null && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] text-dim font-semibold uppercase tracking-wide">
              Progress
            </span>
            <span className={`text-[11px] font-bold ${locked ? 'text-dim' : c.text}`}>
              {locked
                ? `${current} / ${achievement.goal} ${achievement.goalLabel}`
                : `${achievement.goal} / ${achievement.goal} ${achievement.goalLabel}`}
            </span>
          </div>
          <div className="h-2 bg-alt rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${locked ? 'bg-dim/40' : c.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {locked && (
            <div className="text-[10px] text-dim mt-1 text-right">
              {pct}% complete
            </div>
          )}
        </div>
      )}

      {/* How to unlock */}
      {achievement.hint && (
        <div className="bg-alt/60 border border-line/60 rounded-[10px] px-3.5 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-dim mb-1.5">
            How to unlock
          </div>
          <div className="text-[12px] leading-[1.6] text-dim italic">
            {achievement.hint}
          </div>
        </div>
      )}
    </AppSheet>
  )
}
