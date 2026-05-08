/**
 * Player-centric aggregations for the Profile page.
 *
 * Pure functions, no React, no Supabase. Operate on "annotated matches" —
 * each match enriched with the player's perspective:
 *
 *   {
 *     match,           // raw match (with .log, .sets, .score1, .score2, .winner, ...)
 *     pid,             // league-specific player.id used inside match.log
 *     playerTeamNum,   // 1 | 2
 *     playerTeamId,
 *     opposingTeamId,
 *     tournamentId,
 *     tournamentName,
 *     leagueId,
 *     leagueName,
 *     date,
 *     finishRank?,
 *   }
 *
 * The same user can have a different `player.id` in each league, so the
 * per-match `pid` is the source of truth — never `profile.id`.
 *
 * Conventions:
 *   - All percentages are returned as fractions in [0, 1].
 *   - All counts are integers.
 *   - When there is no data, percentages are 0 and counts are 0 (never NaN).
 */

/**
 * Compute a player's win/loss record across all played matches in a league.
 *
 * Replaces the stored players.wins / players.losses DB counters, which are
 * no longer updated per-match. The ranking score combines computed match wins
 * with any tournament-winner bonus points still stored in players.points
 * (written only by completeTournament — +2 for winner, +1 for runner-up).
 *
 * @param {string} playerId  - The player's ID within this league (players.id)
 * @param {object} league    - Full league object from getLeagueById / useLeague
 * @returns {{ wins: number, losses: number, score: number }}
 *   score = wins + stored bonus points (tournament-winner ELO)
 */
export function computePlayerLeagueRecord(playerId, league) {
  if (!playerId || !league) return { wins: 0, losses: 0, score: 0 }

  let wins = 0
  let losses = 0

  for (const tournament of league.tournaments || []) {
    const teams = tournament.teams || []

    // Find which team in this tournament the player belongs to
    const playerTeam = teams.find(t => (t.players || []).includes(playerId))
    if (!playerTeam) continue

    // Collect all matches across groups, knockout, and free-play slots
    const allMatches = [
      ...(tournament.groups  || []).flatMap(g => g.matches || []),
      ...(tournament.knockout?.rounds || []).flatMap(r => r.matches || []),
      ...(tournament.matches || []),
    ]

    for (const match of allMatches) {
      if (!match.played) continue
      // Only matches this team actually played
      if (match.team1 !== playerTeam.id && match.team2 !== playerTeam.id) continue
      if (match.winner === playerTeam.id) wins++
      else losses++
    }
  }

  // Find this player's stored bonus points (tournament-winner ELO: +2/+1)
  const stored = (league.players || []).find(p => p.id === playerId)
  const bonus = stored?.points || 0

  return { wins, losses, score: wins + bonus }
}

const PCT = (num, den) => (den > 0 ? num / den : 0)

const MIN_LEVEL_L1 = 1
const MIN_LEVEL_L2 = 2
const MIN_LEVEL_L3 = 3

function eligibleMatches(annotated, minLevel) {
  return (annotated || []).filter(a => (a.level || 3) >= minLevel)
}

function wrapStat(value, sampleSize, totalMatches, minLevel) {
  return { value, sampleSize, totalMatches, minLevel }
}

/**
 * Maps a raw errorType value (any era) to the canonical action-based id.
 * Legacy trajectory-based values "net" / "out" → "other"
 * null / unknown                               → "untyped"
 */
function normalizeErrorType(raw) {
  if (raw === 'spike' || raw === 'tip' || raw === 'serve' || raw === 'other') return raw;
  if (raw === 'net' || raw === 'out') return 'other';
  return 'untyped';
}

/* ─── Serving ─────────────────────────────────────────────────────────────── */

function computeServingStatsValue(annotated) {
  let totalServes = 0
  let aces = 0
  let serveErrors = 0
  let serveWins = 0
  let longestRun = 0
  let currentRun = 0
  const setBuckets = new Map()

  for (const a of annotated) {
    const log = a.match.log || []
    const pid = a.pid
    currentRun = 0

    for (const e of log) {
      if (!e.team) continue

      const isMyServe = e.serverPlayerId === pid
      const isMyServeError =
        e.pointType === 'error' &&
        e.errorPlayerId === pid &&
        e.errorType === 'serve'

      if (isMyServe || isMyServeError) {
        const setKey = `${a.match.id}:${e.setNum || 0}`
        const bucket = setBuckets.get(setKey) || {
          serves: 0, wins: 0, aces: 0, errors: 0,
          setNum: e.setNum || 0, matchId: a.match.id,
        }
        if (isMyServe) {
          totalServes++
          bucket.serves++
          const wonRally = e.team === e.serverTeam
          if (wonRally) {
            serveWins++
            bucket.wins++
            currentRun++
            if (currentRun > longestRun) longestRun = currentRun
          } else {
            currentRun = 0
          }
          if (e.pointType === 'ace' && wonRally) {
            aces++
            bucket.aces++
          }
        }
        if (isMyServeError) {
          serveErrors++
          bucket.errors++
          totalServes++
          currentRun = 0
        }
        setBuckets.set(setKey, bucket)
      } else {
        currentRun = 0
      }
    }
  }

  const setBySet = Array.from(setBuckets.values()).map(b => ({
    matchId: b.matchId,
    setNum: b.setNum,
    serves: b.serves,
    wins: b.wins,
    aces: b.aces,
    errors: b.errors,
    serveWinPct: PCT(b.wins, b.serves),
  }))

  let bestSet = null
  for (const s of setBySet) {
    if (s.serves < 4) continue
    if (!bestSet || s.serveWinPct > bestSet.serveWinPct) bestSet = s
  }

  return {
    totalServes,
    aces,
    serveErrors,
    serveWins,
    serveInPlayPct: totalServes > 0 ? (totalServes - serveErrors) / totalServes : 0,
    serveWinPct: PCT(serveWins, totalServes),
    aceRate: PCT(aces, totalServes),
    errorRate: PCT(serveErrors, totalServes),
    longestServingRun: longestRun,
    setBySet,
    bestSet,
  }
}

export function computeServingStats(annotated, totalMatches = annotated.length) {
  const sampleSize = (annotated || []).length
  return wrapStat(computeServingStatsValue(annotated), sampleSize, totalMatches, MIN_LEVEL_L3)
}

/* ─── Pressure ────────────────────────────────────────────────────────────── */

function thresholdForSet(match, setNum) {
  const s = match.sets?.[setNum - 1]
  if (!s) return 21
  return Math.max(s.s1 || 0, s.s2 || 0)
}

function computePressureStatsValue(annotated) {
  let clutchPlayed = 0
  let clutchWon = 0
  let clutchLost = 0
  let receives = 0
  let receivesWon = 0
  let comebackPoints = 0
  let decidingSetWins = 0
  let decidingSetLosses = 0

  for (const a of annotated) {
    const m = a.match
    const log = m.log || []
    const pid = a.pid
    const isLastSetDecider = (m.sets?.length || 0) >= 3
    const lastSetIdx = (m.sets?.length || 1) - 1

    if (isLastSetDecider) {
      const lastSet = m.sets[lastSetIdx]
      const wonLast = a.playerTeamNum === 1
        ? (lastSet?.s1 || 0) > (lastSet?.s2 || 0)
        : (lastSet?.s2 || 0) > (lastSet?.s1 || 0)
      if (wonLast) decidingSetWins++; else decidingSetLosses++
    }

    for (const e of log) {
      if (!e.team) continue
      const setNum = e.setNum || 1
      const setIdx = setNum - 1
      const setIsDeciding = isLastSetDecider && setIdx === lastSetIdx
      const threshold = thresholdForSet(m, setNum)

      const myAfter = a.playerTeamNum === 1 ? (e.t1 || 0) : (e.t2 || 0)
      const oppAfter = a.playerTeamNum === 1 ? (e.t2 || 0) : (e.t1 || 0)
      const myBefore = e.team === a.playerTeamNum ? myAfter - 1 : myAfter
      const oppBefore = e.team === a.playerTeamNum ? oppAfter : oppAfter - 1

      const nearEnd = Math.max(myAfter, oppAfter) >= threshold - 3
      if (setIsDeciding || nearEnd) {
        clutchPlayed++
        if (e.team === a.playerTeamNum) clutchWon++; else clutchLost++
      }

      if (e.serverTeam && e.serverTeam !== a.playerTeamNum) {
        receives++
        if (e.team === a.playerTeamNum) receivesWon++
      }

      if (
        e.scoringPlayerId === pid &&
        e.team === a.playerTeamNum &&
        myBefore - oppBefore <= -2
      ) {
        comebackPoints++
      }
    }
  }

  return {
    clutchPlayed,
    clutchWon,
    clutchLost,
    clutchWinPct: PCT(clutchWon, clutchPlayed),
    receives,
    receivesWon,
    sideOutPct: PCT(receivesWon, receives),
    comebackPoints,
    decidingSetWins,
    decidingSetLosses,
    decidingSetWinPct: PCT(decidingSetWins, decidingSetWins + decidingSetLosses),
  }
}

export function computePressureStats(annotated, totalMatches = annotated.length) {
  const sampleSize = (annotated || []).length
  return wrapStat(computePressureStatsValue(annotated), sampleSize, totalMatches, MIN_LEVEL_L3)
}

/* ─── Strengths ───────────────────────────────────────────────────────────── */

function computeStrengthsValue(annotated, leagueAverages) {
  const byType = { ace: 0, spike: 0, block: 0, tip: 0 }
  const errorsByType = { spike: 0, tip: 0, serve: 0, other: 0, untyped: 0 }
  let totalScoring = 0
  let totalErrors = 0

  for (const a of annotated) {
    const log = a.match.log || []
    const pid = a.pid
    for (const e of log) {
      if (e.scoringPlayerId === pid && byType[e.pointType] !== undefined) {
        byType[e.pointType]++
        totalScoring++
      }
      if (e.errorPlayerId === pid) {
        totalErrors++
        const sub = normalizeErrorType(e.errorType)
        if (errorsByType[sub] !== undefined) errorsByType[sub]++
        else errorsByType.untyped++
      }
    }
  }

  const ranked = Object.entries(byType).sort((a, b) => b[1] - a[1])
  const topShot = ranked[0]?.[1] > 0 ? ranked[0][0] : null
  const topShotShare = totalScoring > 0 ? (ranked[0]?.[1] || 0) / totalScoring : 0

  const nonZero = ranked.filter(([, v]) => v > 0)
  const weakestShot = nonZero.length >= 2 ? nonZero[nonZero.length - 1][0] : null

  const errorRanked = Object.entries(errorsByType)
    .filter(([k]) => k !== 'untyped')
    .sort((a, b) => b[1] - a[1])
  const topErrorType = errorRanked[0]?.[1] > 0 ? errorRanked[0][0] : null

  let vsLeague = null
  if (leagueAverages && totalScoring > 0) {
    vsLeague = {}
    for (const k of Object.keys(byType)) {
      const mine = byType[k] / totalScoring
      const avg = leagueAverages[k] || 0
      vsLeague[k] = mine - avg
    }
  }

  return {
    byType,
    errorsByType,
    totalScoring,
    totalErrors,
    topShot,
    topShotShare,
    weakestShot,
    topErrorType,
    vsLeague,
  }
}

export function computeStrengths(annotated, leagueAverages, totalMatches = annotated.length) {
  const sampleSize = (annotated || []).length
  return wrapStat(computeStrengthsValue(annotated, leagueAverages), sampleSize, totalMatches, MIN_LEVEL_L3)
}

/* ─── Playstyle ───────────────────────────────────────────────────────────── */

function computePlaystyleValue(annotated, strengths) {
  const total = strengths.totalScoring
  const share = total > 0
    ? {
        ace: strengths.byType.ace / total,
        spike: strengths.byType.spike / total,
        block: strengths.byType.block / total,
        tip: strengths.byType.tip / total,
      }
    : { ace: 0, spike: 0, block: 0, tip: 0 }

  let label = 'All-rounder'
  if (share.spike >= 0.45) label = 'Aggressor'
  else if (share.ace >= 0.18) label = 'Server'
  else if (share.block >= 0.25) label = 'Defender'

  const attempts = strengths.totalScoring + strengths.totalErrors
  const riskProfile = attempts > 0 ? strengths.totalErrors / attempts : 0

  const consistencyByMatch = []
  for (const a of annotated) {
    let mine = 0
    let team = 0
    const log = a.match.log || []
    const pid = a.pid
    for (const e of log) {
      if (e.team !== a.playerTeamNum) continue
      team++
      if (e.scoringPlayerId === pid) mine++
    }
    consistencyByMatch.push({
      matchId: a.match.id,
      share: team > 0 ? mine / team : 0,
      points: mine,
    })
  }

  const shares = consistencyByMatch.map(c => c.share).filter(s => s > 0)
  let consistency = 1
  if (shares.length >= 2) {
    const mean = shares.reduce((s, v) => s + v, 0) / shares.length
    const variance = shares.reduce((s, v) => s + (v - mean) ** 2, 0) / shares.length
    consistency = Math.max(0, 1 - Math.sqrt(variance) * 2)
  }

  return {
    label,
    share,
    riskProfile,
    consistencyByMatch,
    consistency,
  }
}

export function computePlaystyle(annotated, strengths, totalMatches = annotated.length) {
  const sampleSize = (annotated || []).length
  return wrapStat(computePlaystyleValue(annotated, strengths), sampleSize, totalMatches, MIN_LEVEL_L3)
}

/* ─── Tournament breakdown ────────────────────────────────────────────────── */

export function computeByTournament(annotated) {
  const by = new Map()
  for (const a of annotated) {
    if (!by.has(a.tournamentId)) {
      by.set(a.tournamentId, {
        leagueId: a.leagueId,
        leagueName: a.leagueName,
        tournamentId: a.tournamentId,
        tournamentName: a.tournamentName,
        date: a.date,
        finishRank: a.finishRank ?? null,
        matches: [],
        wins: 0,
        losses: 0,
        points: 0,
        aces: 0,
        spikes: 0,
        serves: 0,
        serveWins: 0,
        serveWinPct: 0,
      })
    }
    const t = by.get(a.tournamentId)
    t.matches.push(a)
    if (a.match.winner === a.playerTeamId) t.wins++
    else if (a.match.winner) t.losses++
  }

  for (const t of by.values()) {
    for (const a of t.matches) {
      const log = a.match.log || []
      const pid = a.pid
      for (const e of log) {
        if (e.scoringPlayerId === pid) {
          t.points++
          if (e.pointType === 'ace') t.aces++
          if (e.pointType === 'spike') t.spikes++
        }
        if (e.team && e.serverPlayerId === pid) {
          t.serves++
          if (e.team === e.serverTeam) t.serveWins++
        }
      }
    }
    t.serveWinPct = t.serves > 0 ? t.serveWins / t.serves : 0
  }

  return Array.from(by.values()).sort((a, b) => (b.date || 0) - (a.date || 0))
}

/* ─── Win streak ──────────────────────────────────────────────────────────── */

function computeWinStreakValue(annotated) {
  const ordered = [...annotated].sort((a, b) => (a.date || 0) - (b.date || 0))
  let best = 0
  let cur = 0
  for (const a of ordered) {
    const won = a.match.winner === a.playerTeamId
    if (won) {
      cur++
      if (cur > best) best = cur
    } else {
      cur = 0
    }
  }
  return { bestStreak: best, currentStreak: cur }
}

export function computeWinStreak(annotated, totalMatches = annotated.length) {
  const sampleSize = (annotated || []).length
  return wrapStat(computeWinStreakValue(annotated), sampleSize, totalMatches, MIN_LEVEL_L1)
}

export function computePerMatchAverages(annotated, totalMatches = annotated.length) {
  let points = 0
  let errors = 0
  for (const a of annotated || []) {
    const pid = a.pid
    for (const e of a.match.log || []) {
      if (e.scoringPlayerId === pid) points++
      if (e.errorPlayerId === pid) errors++
    }
  }
  const sampleSize = (annotated || []).length
  const value = {
    pointsPerMatch: PCT(points, sampleSize),
    errorsPerMatch: PCT(errors, sampleSize),
    netPointsPerMatch: PCT(points - errors, sampleSize),
  }
  return wrapStat(value, sampleSize, totalMatches, MIN_LEVEL_L2)
}

/* ─── Headline bundle ─────────────────────────────────────────────────────── */

export function computeAllPlayerStats(annotated) {
  const totalMatches = (annotated || []).length
  const l1Matches = eligibleMatches(annotated, MIN_LEVEL_L1)
  const l2Matches = eligibleMatches(annotated, MIN_LEVEL_L2)
  const l3Matches = eligibleMatches(annotated, MIN_LEVEL_L3)

  const serving = computeServingStats(l3Matches, totalMatches)
  const pressure = computePressureStats(l3Matches, totalMatches)
  const strengths = computeStrengths(l3Matches, null, totalMatches)
  const playstyle = computePlaystyle(l3Matches, strengths.value, totalMatches)
  const byTournament = computeByTournament(annotated)
  const streaks = computeWinStreak(l1Matches, totalMatches)
  const perMatchAverages = computePerMatchAverages(l2Matches, totalMatches)

  let wins = 0
  let losses = 0
  for (const a of l1Matches) {
    if (a.match.winner === a.playerTeamId) wins++
    else if (a.match.winner) losses++
  }
  const wlTotal = wins + losses

  const winsStat = wrapStat(wins, l1Matches.length, totalMatches, MIN_LEVEL_L1)
  const lossesStat = wrapStat(losses, l1Matches.length, totalMatches, MIN_LEVEL_L1)
  const winRateStat = wrapStat(PCT(wins, wlTotal), l1Matches.length, totalMatches, MIN_LEVEL_L1)
  const bestWinStreakStat = wrapStat(streaks.value.bestStreak, l1Matches.length, totalMatches, MIN_LEVEL_L1)
  const currentWinStreakStat = wrapStat(streaks.value.currentStreak, l1Matches.length, totalMatches, MIN_LEVEL_L1)

  return {
    totalMatches,
    wins: winsStat,
    losses: lossesStat,
    winRate: winRateStat,
    bestWinStreak: bestWinStreakStat,
    currentWinStreak: currentWinStreakStat,
    perMatchAverages,
    serving,
    pressure,
    strengths,
    playstyle,
    byType: wrapStat(strengths.value.byType, l3Matches.length, totalMatches, MIN_LEVEL_L3),
    byTournament,

    // Compatibility aliases for existing consumers that still read bare values.
    winsValue: wins,
    lossesValue: losses,
    winRateValue: winRateStat.value,
    bestWinStreakValue: bestWinStreakStat.value,
    currentWinStreakValue: currentWinStreakStat.value,
  }
}
