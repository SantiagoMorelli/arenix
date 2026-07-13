/**
 * Tournament-wide stats aggregations.
 *
 * Pure functions, no React. Operate on the in-memory match shape returned by
 * `getAllMatches(tournament)` — i.e. each match has `team1`, `team2`,
 * `score1`, `score2`, `winner`, `played`, `log`, `sets`, `label`.
 *
 * Per-point fields used:
 *   pointType:        'ace' | 'spike' | 'block' | 'tip' | 'error'
 *   scoringPlayerId:  set when not an error
 *   errorPlayerId:    set when pointType === 'error'
 *   errorType:        'spike' | 'tip' | 'serve' | 'other' | null  (null = pre-feature)
 *                     Legacy values 'net' / 'out' are mapped to 'other' at read-time.
 *   serverPlayerId:   present on every scoring point
 *   serverTeam:       1 | 2  — team that served the point
 *   team:             1 | 2  — team that won the point
 *   setNum, t1, t2, timestamp, streak
 */
import { getMatchDuration, getLongestRally } from './utils'

/**
 * Maps a raw errorType value (any era) to the canonical action-based id.
 * "net" and "out" (old trajectory-based values) → "other"
 * null / unknown                                → "untyped"
 */
function normalizeErrorType(raw) {
  if (raw === 'spike' || raw === 'tip' || raw === 'serve' || raw === 'other') return raw;
  if (raw === 'net' || raw === 'out') return 'other';
  return 'untyped';
}

const EMPTY_PLAYER = () => ({
  points: 0,
  aces: 0,
  spikes: 0,
  blocks: 0,
  tips: 0,
  errors: 0,
  serves: 0,
  serveWins: 0,
  serveWinPct: 0,
})

// ─── Core per-player aggregator ─────────────────────────────────────────────
// Returns { [playerId]: { points, aces, spikes, blocks, tips, errors,
//                          serves, serveWins, serveWinPct } }
export function computePlayerStats(allMatches) {
  const stats = {}

  for (const m of allMatches) {
    if (!m.played || !m.log?.length) continue

    for (const entry of m.log) {
      // Score and per-type counters
      if (entry.scoringPlayerId) {
        const pid = entry.scoringPlayerId
        if (!stats[pid]) stats[pid] = EMPTY_PLAYER()
        stats[pid].points++
        if (entry.pointType === 'ace')   stats[pid].aces++
        if (entry.pointType === 'spike') stats[pid].spikes++
        if (entry.pointType === 'block') stats[pid].blocks++
        if (entry.pointType === 'tip')   stats[pid].tips++
      }
      if (entry.errorPlayerId) {
        const pid = entry.errorPlayerId
        if (!stats[pid]) stats[pid] = EMPTY_PLAYER()
        stats[pid].errors++
      }

      // Serve counters — only count entries that actually scored a point.
      // (Some log entries are bookkeeping rows like "SET ENDED" without team.)
      if (entry.team && entry.serverPlayerId) {
        const sid = entry.serverPlayerId
        if (!stats[sid]) stats[sid] = EMPTY_PLAYER()
        stats[sid].serves++
        if (entry.team === entry.serverTeam) stats[sid].serveWins++
      }
    }
  }

  // Derive serveWinPct
  for (const pid of Object.keys(stats)) {
    const s = stats[pid]
    s.serveWinPct = s.serves ? Math.round((s.serveWins / s.serves) * 100) : 0
  }

  return stats
}

// ─── Ranking list for an award ──────────────────────────────────────────────
// Returns [{ pid, name, value, secondary }] sorted desc by value, then name.
// `minThreshold` filters out players whose `gateKey` value (defaults to the
// stat key itself) is below the threshold — used for "Most Efficient Server"
// to require ≥ 10 serves before the percentage matters.
export function rankPlayersByStat(playerStats, statKey, opts = {}) {
  const { leaguePlayers = [], minThreshold = 0, gateKey = null, secondaryKey = null } = opts

  const nameOf = (pid) => {
    const p = leaguePlayers.find(x => x.id === pid)
    return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
  }

  const gate = gateKey || statKey
  const rows = []

  for (const [pid, val] of Object.entries(playerStats)) {
    if (minThreshold > 0 && (val[gate] || 0) < minThreshold) continue
    if ((val[statKey] || 0) <= 0 && minThreshold === 0) continue
    rows.push({
      pid,
      name: nameOf(pid),
      value: val[statKey] || 0,
      secondary: secondaryKey ? (val[secondaryKey] || 0) : null,
    })
  }

  rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
  return rows
}

export const TOURNAMENT_RANKING_MIN_LEVELS = {
  points: 2,
  errors: 2,
  aces: 3,
  spikes: 3,
  blocks: 3,
  tips: 3,
  serveWinPct: 3,
}

// ─── Per-team tournament totals ─────────────────────────────────────────────
// `team` is the team object on `tournament.teams`: { id, name, players: [pid] }
// Returns { pointsScored, mistakes, wins, losses, perPlayer: [...] }
//   pointsScored = sum across all matches of "points won by this team"
//   mistakes     = sum across all matches of "errors committed by team players"
//                  (includes both scoring-side errors and team-attributed error
//                  log entries — i.e. distinct from points-against, which can
//                  also be opponent winners)
export function computeTeamTournamentTotals(team, allMatches, leaguePlayers = []) {
  if (!team) return { pointsScored: 0, mistakes: 0, wins: 0, losses: 0, perPlayer: [] }

  const playerIdSet = new Set(team.players || [])
  const playerStats = {}
  for (const pid of playerIdSet) playerStats[pid] = EMPTY_PLAYER()

  let pointsScored = 0
  let mistakes = 0
  let wins = 0
  let losses = 0

  for (const m of allMatches) {
    if (!m.played) continue
    const isT1 = m.team1 === team.id
    const isT2 = m.team2 === team.id
    if (!isT1 && !isT2) continue

    pointsScored += isT1 ? (m.score1 || 0) : (m.score2 || 0)
    if (m.winner === team.id) wins++; else losses++

    if (!m.log?.length) continue
    for (const entry of m.log) {
      if (entry.scoringPlayerId && playerIdSet.has(entry.scoringPlayerId)) {
        const pid = entry.scoringPlayerId
        playerStats[pid].points++
        if (entry.pointType === 'ace')   playerStats[pid].aces++
        if (entry.pointType === 'spike') playerStats[pid].spikes++
        if (entry.pointType === 'block') playerStats[pid].blocks++
        if (entry.pointType === 'tip')   playerStats[pid].tips++
      }
      if (entry.errorPlayerId && playerIdSet.has(entry.errorPlayerId)) {
        playerStats[entry.errorPlayerId].errors++
        mistakes++
      }
    }
  }

  const nameOf = (pid) => {
    const p = leaguePlayers.find(x => x.id === pid)
    return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
  }

  const perPlayer = (team.players || []).map(pid => ({
    pid,
    name: nameOf(pid),
    points: playerStats[pid]?.points || 0,
    errors: playerStats[pid]?.errors || 0,
    net: (playerStats[pid]?.points || 0) - (playerStats[pid]?.errors || 0),
  }))

  return { pointsScored, mistakes, wins, losses, perPlayer }
}

// ─── Per-player tournament breakdown ────────────────────────────────────────
// Used by PlayerTournamentDetailSheet. Returns the full picture for one player
// across every match they appeared in.
export function computePlayerTournamentBreakdown(pid, allMatches, scoringLevel = 3) {
  const result = {
    points: 0,
    byType: { ace: 0, spike: 0, block: 0, tip: 0 },
    errors: 0,
    errorsByType: { spike: 0, tip: 0, serve: 0, other: 0, untyped: 0 },
    serves: 0,
    serveWins: 0,
    serveAces: 0,
    matchIds: new Set(),
    setKeys: new Set(),
  }

  for (const m of allMatches) {
    if (!m.played || !m.log?.length) continue

    let touchedThisMatch = false

    for (const entry of m.log) {
      if (entry.scoringPlayerId === pid) {
        result.points++
        if (entry.pointType === 'ace')   result.byType.ace++
        if (entry.pointType === 'spike') result.byType.spike++
        if (entry.pointType === 'block') result.byType.block++
        if (entry.pointType === 'tip')   result.byType.tip++
        touchedThisMatch = true
        if (entry.setNum) result.setKeys.add(`${m.id}:${entry.setNum}`)
      }
      if (entry.errorPlayerId === pid) {
        result.errors++
        const sub = normalizeErrorType(entry.errorType)
        result.errorsByType[sub]++
        touchedThisMatch = true
        if (entry.setNum) result.setKeys.add(`${m.id}:${entry.setNum}`)
      }
      if (entry.team && entry.serverPlayerId === pid) {
        result.serves++
        if (entry.team === entry.serverTeam) result.serveWins++
        if (entry.pointType === 'ace') result.serveAces++
        touchedThisMatch = true
        if (entry.setNum) result.setKeys.add(`${m.id}:${entry.setNum}`)
      }
    }

    if (touchedThisMatch) result.matchIds.add(m.id)
  }

  if (scoringLevel < 3) {
    return {
      points: result.points,
      errors: result.errors,
    }
  }

  const matchesPlayed = result.matchIds.size
  const setsPlayed = result.setKeys.size
  const serveWinPct = result.serves ? Math.round((result.serveWins / result.serves) * 100) : 0

  return {
    points: result.points,
    byType: result.byType,
    errors: result.errors,
    errorsByType: result.errorsByType,
    serves: result.serves,
    serveWins: result.serveWins,
    serveWinPct,
    serveAces: result.serveAces,
    net: result.points - result.errors,
    matchesPlayed,
    setsPlayed,
  }
}

// ─── Tournament match records ────────────────────────────────────────────────
// Blowouts, streaks, comebacks, durations across a tournament's played
// matches. Shared by TournamentStatsScreen (completed) and the live Stats tab.
export function computeMatchRecords(allMatches) {
  const played = allMatches.filter(m => m.played && m.team1 && m.team2)
  if (!played.length) return null

  let mostDominant = null, dominance = -1
  let highestScoring = null, highScore = -1
  let longestStreak = null, streak = 0
  let biggestComeback = null, maxComeback = 0

  for (const m of played) {
    const diff  = Math.abs(m.score1 - m.score2)
    const total = m.score1 + m.score2

    if (diff > dominance) { dominance = diff; mostDominant = m }
    if (total > highScore) { highScore = total; highestScoring = m }

    if (m.log?.length) {
      for (const entry of m.log) {
        if ((entry.streak || 0) > streak) { streak = entry.streak; longestStreak = { match: m, streak: entry.streak, team: entry.team } }
      }

      // Biggest comeback: per set, track max deficit overcome by winner
      const setNums = [...new Set(m.log.map(e => e.setNum))]
      for (const sn of setNums) {
        const entries = m.log.filter(e => e.setNum === sn).sort((a, b) => a.pointNum - b.pointNum)
        if (!entries.length) continue
        const last = entries[entries.length - 1]
        const setWinner = last.t1 > last.t2 ? 1 : 2

        let maxDeficit = 0
        for (const e of entries) {
          const deficit = setWinner === 1 ? e.t2 - e.t1 : e.t1 - e.t2
          if (deficit > maxDeficit) maxDeficit = deficit
        }
        if (maxDeficit > maxComeback) {
          maxComeback = maxDeficit
          biggestComeback = { match: m, team: setWinner === 1 ? m.team1 : m.team2, deficit: maxDeficit }
        }
      }
    }
  }

  let longestGame = null, longestGameDuration = 0
  let longestRallyRecord = null, longestRallyDuration = 0

  for (const m of played) {
    if (!m.log?.length) continue

    const dur = getMatchDuration(m.log)
    if (dur != null && dur > longestGameDuration) {
      longestGameDuration = dur
      longestGame = { match: m, duration: dur }
    }

    const rally = getLongestRally(m.log)
    if (rally != null && rally > longestRallyDuration) {
      longestRallyDuration = rally
      longestRallyRecord = { match: m, duration: rally }
    }
  }

  return { mostDominant, dominance, highestScoring, highScore, longestStreak, biggestComeback, longestGame, longestRally: longestRallyRecord }
}

// ─── Match-level points-by-type breakdown (per team) ────────────────────────
// Used by MatchBreakdownSheet. Returns
//   { team1: { total, byType: {ace,spike,block,tip,error}, perPlayer: [...] },
//     team2: { ... } }
export function computeMatchBreakdown(match, leaguePlayers = [], teams = []) {
  const log = match?.log || []
  const teamObj = id => teams.find(t => t.id === id)
  const nameOf = (pid) => {
    const p = leaguePlayers.find(x => x.id === pid)
    return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
  }

  const blank = (id) => {
    const t = teamObj(id)
    return {
      teamId: id,
      teamName: t?.name || '?',
      total: 0,
      byType: { ace: 0, spike: 0, block: 0, tip: 0, error: 0 },
      perPlayer: (t?.players || []).map(pid => ({
        pid, name: nameOf(pid),
        points: 0, errors: 0,
        byType: { ace: 0, spike: 0, block: 0, tip: 0 },
      })),
    }
  }

  const out = { team1: blank(match.team1), team2: blank(match.team2) }
  const slot = (teamNum) => teamNum === 1 ? out.team1 : out.team2

  for (const entry of log) {
    if (!entry.team) continue
    const winSlot = slot(entry.team)
    winSlot.total++
    if (winSlot.byType[entry.pointType] !== undefined) {
      winSlot.byType[entry.pointType]++
    }
    // Per-player aggregation: scoring vs error attribution
    if (entry.scoringPlayerId) {
      const player = winSlot.perPlayer.find(p => p.pid === entry.scoringPlayerId)
      if (player) {
        player.points++
        if (player.byType[entry.pointType] !== undefined) {
          player.byType[entry.pointType]++
        }
      }
    }
    if (entry.errorPlayerId) {
      const errorSlot = slot(entry.team === 1 ? 2 : 1)
      const player = errorSlot.perPlayer.find(p => p.pid === entry.errorPlayerId)
      if (player) player.errors++
    }
  }

  return out
}
