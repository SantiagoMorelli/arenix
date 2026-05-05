/**
 * Achievement registry. Pure data + predicates — no React, no side effects.
 *
 * Each entry:
 *   id          string  — stable, used as the localStorage key for "seen unlocks"
 *   category    string  — one of CATEGORIES
 *   name        string  — short display name
 *   description string  — sub-line shown on the badge / in the toast
 *   icon        string  — Lucide icon name, resolved by the badge component
 *   color       'accent' | 'free' | 'success' | 'error'
 *   unlocked    (stats) => boolean
 *   progress    (stats) => number in [0, 1]   — partial progress for the ring
 */

export const CATEGORIES = [
  { id: 'milestones',  label: 'Milestones'  },
  { id: 'skill',       label: 'Skill'       },
  { id: 'streaks',     label: 'Streaks'     },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'social',      label: 'Social'      },
]

const clamp01 = (n) => Math.max(0, Math.min(1, n || 0))

export const ACHIEVEMENTS = [
  // ─── Milestones ─────────────────────────────────────────────────────────
  {
    id: 'first-match', category: 'milestones', name: 'First match',
    description: 'Played your first tournament match',
    icon: 'PlayCircle', color: 'accent',
    unlocked: (s) => s.totalMatches >= 1,
    progress: (s) => clamp01(s.totalMatches / 1),
  },
  {
    id: 'ten-matches', category: 'milestones', name: 'Regular',
    description: '10 tournament matches played',
    icon: 'Repeat', color: 'accent',
    unlocked: (s) => s.totalMatches >= 10,
    progress: (s) => clamp01(s.totalMatches / 10),
  },
  {
    id: 'fifty-matches', category: 'milestones', name: 'Veteran',
    description: '50 tournament matches played',
    icon: 'ShieldCheck', color: 'accent',
    unlocked: (s) => s.totalMatches >= 50,
    progress: (s) => clamp01(s.totalMatches / 50),
  },
  {
    id: 'hundred-matches', category: 'milestones', name: 'Centurion',
    description: '100 tournament matches played',
    icon: 'Crown', color: 'accent',
    unlocked: (s) => s.totalMatches >= 100,
    progress: (s) => clamp01(s.totalMatches / 100),
  },

  // ─── Skill ──────────────────────────────────────────────────────────────
  {
    id: 'ace-master', category: 'skill', name: 'Ace master',
    description: '25 aces',
    icon: 'Zap', color: 'success',
    unlocked: (s) => (s.serving?.aces || 0) >= 25,
    progress: (s) => clamp01((s.serving?.aces || 0) / 25),
  },
  {
    id: 'spike-machine', category: 'skill', name: 'Spike machine',
    description: '100 spikes scored',
    icon: 'Swords', color: 'success',
    unlocked: (s) => (s.byType?.spike || 0) >= 100,
    progress: (s) => clamp01((s.byType?.spike || 0) / 100),
  },
  {
    id: 'wall', category: 'skill', name: 'The wall',
    description: '50 blocks',
    icon: 'Shield', color: 'success',
    unlocked: (s) => (s.byType?.block || 0) >= 50,
    progress: (s) => clamp01((s.byType?.block || 0) / 50),
  },
  {
    id: 'sharpshooter', category: 'skill', name: 'Sharpshooter',
    description: '60% serve win on 50+ serves',
    icon: 'Target', color: 'success',
    unlocked: (s) =>
      (s.serving?.serveWinPct || 0) >= 0.6 && (s.serving?.totalServes || 0) >= 50,
    progress: (s) => {
      const serves = clamp01((s.serving?.totalServes || 0) / 50)
      const winPct = clamp01((s.serving?.serveWinPct || 0) / 0.6)
      return clamp01((serves + winPct) / 2)
    },
  },
  {
    id: 'clean-server', category: 'skill', name: 'Clean server',
    description: '92% serve-in-play on 50+ serves',
    icon: 'Sparkles', color: 'success',
    unlocked: (s) =>
      (s.serving?.serveInPlayPct || 0) >= 0.92 && (s.serving?.totalServes || 0) >= 50,
    progress: (s) => {
      const serves = clamp01((s.serving?.totalServes || 0) / 50)
      const inPlay = clamp01((s.serving?.serveInPlayPct || 0) / 0.92)
      return clamp01((serves + inPlay) / 2)
    },
  },

  // ─── Streaks ────────────────────────────────────────────────────────────
  {
    id: 'hot-streak', category: 'streaks', name: 'Hot streak',
    description: '5 wins in a row',
    icon: 'Flame', color: 'accent',
    unlocked: (s) => (s.bestWinStreak || 0) >= 5,
    progress: (s) => clamp01((s.bestWinStreak || 0) / 5),
  },
  {
    id: 'unstoppable', category: 'streaks', name: 'Unstoppable',
    description: '10 wins in a row',
    icon: 'Rocket', color: 'accent',
    unlocked: (s) => (s.bestWinStreak || 0) >= 10,
    progress: (s) => clamp01((s.bestWinStreak || 0) / 10),
  },
  {
    id: 'comeback-kid', category: 'streaks', name: 'Comeback kid',
    description: '20 points scored while trailing',
    icon: 'TrendingUp', color: 'accent',
    unlocked: (s) => (s.pressure?.comebackPoints || 0) >= 20,
    progress: (s) => clamp01((s.pressure?.comebackPoints || 0) / 20),
  },

  // ─── Tournaments ────────────────────────────────────────────────────────
  {
    id: 'champion', category: 'tournaments', name: 'Champion',
    description: 'Won a tournament',
    icon: 'Trophy', color: 'accent',
    unlocked: (s) => (s.tournamentWins || 0) >= 1,
    progress: (s) => clamp01((s.tournamentWins || 0) / 1),
  },
  {
    id: 'triple-crown', category: 'tournaments', name: 'Triple crown',
    description: 'Won 3 tournaments',
    icon: 'Award', color: 'accent',
    unlocked: (s) => (s.tournamentWins || 0) >= 3,
    progress: (s) => clamp01((s.tournamentWins || 0) / 3),
  },
  {
    id: 'clutch-player', category: 'tournaments', name: 'Clutch',
    description: '60% clutch win rate on 30+ clutch points',
    icon: 'Flame', color: 'error',
    unlocked: (s) =>
      (s.pressure?.clutchWinPct || 0) >= 0.6 && (s.pressure?.clutchPlayed || 0) >= 30,
    progress: (s) => {
      const played = clamp01((s.pressure?.clutchPlayed || 0) / 30)
      const winPct = clamp01((s.pressure?.clutchWinPct || 0) / 0.6)
      return clamp01((played + winPct) / 2)
    },
  },
  {
    id: 'decider', category: 'tournaments', name: 'The decider',
    description: 'Won 3 deciding sets',
    icon: 'Hourglass', color: 'error',
    unlocked: (s) => (s.pressure?.decidingSetWins || 0) >= 3,
    progress: (s) => clamp01((s.pressure?.decidingSetWins || 0) / 3),
  },

  // ─── Social ─────────────────────────────────────────────────────────────
  {
    id: 'multi-league', category: 'social', name: 'Globetrotter',
    description: 'Active in 3 leagues',
    icon: 'Globe', color: 'free',
    unlocked: (s) => (s.leagueCount || 0) >= 3,
    progress: (s) => clamp01((s.leagueCount || 0) / 3),
  },
  {
    id: 'team-player', category: 'social', name: 'Team player',
    description: 'Partnered with 5 different players',
    icon: 'Users', color: 'free',
    unlocked: (s) => (s.uniquePartners || 0) >= 5,
    progress: (s) => clamp01((s.uniquePartners || 0) / 5),
  },
  {
    id: 'rivalry', category: 'social', name: 'Rivalry',
    description: 'Faced 10 different opponents',
    icon: 'Swords', color: 'free',
    unlocked: (s) => (s.uniqueOpponents || 0) >= 10,
    progress: (s) => clamp01((s.uniqueOpponents || 0) / 10),
  },
]

export function evaluateAchievements(stats) {
  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: !!a.unlocked(stats),
    progressValue: a.progress ? a.progress(stats) : 0,
  }))
}

export function summarizeByCategory(evaluated) {
  const map = new Map(CATEGORIES.map(c => [c.id, { ...c, unlocked: 0, total: 0 }]))
  for (const a of evaluated) {
    const cat = map.get(a.category)
    if (!cat) continue
    cat.total++
    if (a.unlocked) cat.unlocked++
  }
  return Array.from(map.values())
}
