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
    hint: 'Join any league, enter a tournament, and complete one match with point logging enabled.',
    goal: 1, goalLabel: 'match played',
    stat: (s) => s.totalMatches || 0,
    icon: 'PlayCircle', color: 'accent',
    unlocked: (s) => s.totalMatches >= 1,
    progress: (s) => clamp01(s.totalMatches / 1),
  },
  {
    id: 'ten-matches', category: 'milestones', name: 'Regular',
    description: '10 tournament matches played',
    hint: 'Keep playing — every tournament match counts toward this, win or lose.',
    goal: 10, goalLabel: 'matches played',
    stat: (s) => s.totalMatches || 0,
    icon: 'Repeat', color: 'accent',
    unlocked: (s) => s.totalMatches >= 10,
    progress: (s) => clamp01(s.totalMatches / 10),
  },
  {
    id: 'fifty-matches', category: 'milestones', name: 'Veteran',
    description: '50 tournament matches played',
    hint: 'A true regular. Keep competing across tournaments and leagues to reach 50 matches.',
    goal: 50, goalLabel: 'matches played',
    stat: (s) => s.totalMatches || 0,
    icon: 'ShieldCheck', color: 'accent',
    unlocked: (s) => s.totalMatches >= 50,
    progress: (s) => clamp01(s.totalMatches / 50),
  },
  {
    id: 'hundred-matches', category: 'milestones', name: 'Centurion',
    description: '100 tournament matches played',
    hint: 'Elite status. Only the most dedicated players reach 100 logged tournament matches.',
    goal: 100, goalLabel: 'matches played',
    stat: (s) => s.totalMatches || 0,
    icon: 'Crown', color: 'accent',
    unlocked: (s) => s.totalMatches >= 100,
    progress: (s) => clamp01(s.totalMatches / 100),
  },

  // ─── Skill ──────────────────────────────────────────────────────────────
  {
    id: 'ace-master', category: 'skill', name: 'Ace master',
    description: '25 aces scored',
    hint: 'An ace is a serve the opponent cannot return before it bounces twice. Focus on placement — deep corners and sideline edges are hardest to reach.',
    goal: 25, goalLabel: 'aces',
    stat: (s) => s.serving?.aces || 0,
    icon: 'Zap', color: 'success',
    unlocked: (s) => (s.serving?.aces || 0) >= 25,
    progress: (s) => clamp01((s.serving?.aces || 0) / 25),
  },
  {
    id: 'spike-machine', category: 'skill', name: 'Spike machine',
    description: '100 spikes scored',
    hint: 'Spikes are attacking shots logged as point-winning kills. Score 100 of them across all your matches.',
    goal: 100, goalLabel: 'spikes',
    stat: (s) => s.strengths?.byType?.spike || 0,
    icon: 'Swords', color: 'success',
    unlocked: (s) => (s.byType?.spike || 0) >= 100,
    progress: (s) => clamp01((s.byType?.spike || 0) / 100),
  },
  {
    id: 'wall', category: 'skill', name: 'The wall',
    description: '50 blocks scored',
    hint: 'A block is a defensive point won by stopping an opponent\'s attack. Play at the net, read the spike, and redirect it for a winner.',
    goal: 50, goalLabel: 'blocks',
    stat: (s) => s.strengths?.byType?.block || 0,
    icon: 'Shield', color: 'success',
    unlocked: (s) => (s.byType?.block || 0) >= 50,
    progress: (s) => clamp01((s.byType?.block || 0) / 50),
  },
  {
    id: 'sharpshooter', category: 'skill', name: 'Sharpshooter',
    description: '60% serve win rate on 50+ serves',
    hint: 'You need at least 50 serves recorded AND win 60% of points on your serve. Consistency over pace — keep the ball in and make the opponent work.',
    goal: 50, goalLabel: 'serves + 60% win rate',
    stat: (s) => s.serving?.totalServes || 0,
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
    description: '92% serve-in-play rate on 50+ serves',
    hint: 'You need at least 50 serves recorded AND 92% of them landing in play (no net, no out). Reduce foot faults and err on the safe side of the line.',
    goal: 50, goalLabel: 'serves + 92% in-play rate',
    stat: (s) => s.serving?.totalServes || 0,
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
    hint: 'Win 5 consecutive tournament matches without a loss in between. Streaks can span multiple tournaments.',
    goal: 5, goalLabel: 'consecutive wins',
    stat: (s) => s.bestWinStreak || 0,
    icon: 'Flame', color: 'accent',
    unlocked: (s) => (s.bestWinStreak || 0) >= 5,
    progress: (s) => clamp01((s.bestWinStreak || 0) / 5),
  },
  {
    id: 'unstoppable', category: 'streaks', name: 'Unstoppable',
    description: '10 wins in a row',
    hint: 'String together 10 consecutive wins without a single loss. Your best all-time streak counts.',
    goal: 10, goalLabel: 'consecutive wins',
    stat: (s) => s.bestWinStreak || 0,
    icon: 'Rocket', color: 'accent',
    unlocked: (s) => (s.bestWinStreak || 0) >= 10,
    progress: (s) => clamp01((s.bestWinStreak || 0) / 10),
  },
  {
    id: 'comeback-kid', category: 'streaks', name: 'Comeback kid',
    description: '20 points scored while trailing',
    hint: 'Score 20 total points in moments when your team is losing by 2 or more. Measured cumulatively across all matches.',
    goal: 20, goalLabel: 'comeback points',
    stat: (s) => s.pressure?.comebackPoints || 0,
    icon: 'TrendingUp', color: 'accent',
    unlocked: (s) => (s.pressure?.comebackPoints || 0) >= 20,
    progress: (s) => clamp01((s.pressure?.comebackPoints || 0) / 20),
  },

  // ─── Tournaments ────────────────────────────────────────────────────────
  {
    id: 'champion', category: 'tournaments', name: 'Champion',
    description: 'Won a tournament',
    hint: 'Finish first place in any league tournament. Win every match in the bracket or round-robin to claim the top spot.',
    goal: 1, goalLabel: 'tournament won',
    stat: (s) => s.tournamentWins || 0,
    icon: 'Trophy', color: 'accent',
    unlocked: (s) => (s.tournamentWins || 0) >= 1,
    progress: (s) => clamp01((s.tournamentWins || 0) / 1),
  },
  {
    id: 'triple-crown', category: 'tournaments', name: 'Triple crown',
    description: 'Won 3 tournaments',
    hint: 'Claim first place in 3 separate tournaments. They can be in the same league or across different leagues.',
    goal: 3, goalLabel: 'tournaments won',
    stat: (s) => s.tournamentWins || 0,
    icon: 'Award', color: 'accent',
    unlocked: (s) => (s.tournamentWins || 0) >= 3,
    progress: (s) => clamp01((s.tournamentWins || 0) / 3),
  },
  {
    id: 'clutch-player', category: 'tournaments', name: 'Clutch',
    description: '60% clutch win rate on 30+ clutch points',
    hint: 'Clutch points are the last 4 points of any set and all deciding-set moments. You need 30+ of them AND win at least 60%. Stay calm under pressure.',
    goal: 30, goalLabel: 'clutch points + 60% win rate',
    stat: (s) => s.pressure?.clutchPlayed || 0,
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
    hint: 'A deciding set is the final set when the match is tied. Win 3 of these clutch situations across all your matches.',
    goal: 3, goalLabel: 'deciding sets won',
    stat: (s) => s.pressure?.decidingSetWins || 0,
    icon: 'Hourglass', color: 'error',
    unlocked: (s) => (s.pressure?.decidingSetWins || 0) >= 3,
    progress: (s) => clamp01((s.pressure?.decidingSetWins || 0) / 3),
  },

  // ─── Social ─────────────────────────────────────────────────────────────
  {
    id: 'multi-league', category: 'social', name: 'Globetrotter',
    description: 'Active in 3 leagues',
    hint: 'Join and participate in 3 different leagues. Use the Join League option on the home screen to find new leagues.',
    goal: 3, goalLabel: 'leagues joined',
    stat: (s) => s.leagueCount || 0,
    icon: 'Globe', color: 'free',
    unlocked: (s) => (s.leagueCount || 0) >= 3,
    progress: (s) => clamp01((s.leagueCount || 0) / 3),
  },
  {
    id: 'team-player', category: 'social', name: 'Team player',
    description: 'Partnered with 5 different players',
    hint: 'Play tournament matches alongside 5 unique teammates. Doubles formats count — each new partner moves you closer.',
    goal: 5, goalLabel: 'unique partners',
    stat: (s) => s.uniquePartners || 0,
    icon: 'Users', color: 'free',
    unlocked: (s) => (s.uniquePartners || 0) >= 5,
    progress: (s) => clamp01((s.uniquePartners || 0) / 5),
  },
  {
    id: 'rivalry', category: 'social', name: 'Rivalry',
    description: 'Faced 10 different opponents',
    hint: 'Play against 10 unique opponents across any matches. The more tournaments you enter, the more varied your matchups.',
    goal: 10, goalLabel: 'unique opponents',
    stat: (s) => s.uniqueOpponents || 0,
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
