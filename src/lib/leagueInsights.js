/**
 * leagueInsights — pure aggregations over a full league object (from
 * getLeagueById / useLeague) that power the Rankings engagement feed:
 * ELO timelines, streaks, champions wall, stat highlights, activity feed.
 *
 * No React, no Supabase. Everything is computed client-side from data the
 * league page already loads.
 */
import { simulateTournamentElo } from './elo'
import { computePlayerStats } from './tournamentStats'

const BASE_ELO = 1000

// ─── Shared helpers ───────────────────────────────────────────────────────────

function playerLabel(p) {
  return p?.displayName || p?.name || 'Unknown'
}

/** All matches of a tournament across groups, knockout, and free-play slots. */
function allTournamentMatches(tournament) {
  return [
    ...(tournament.groups || []).flatMap(g => g.matches || []),
    ...(tournament.knockout?.rounds || []).flatMap(r => r.matches || []),
    ...(tournament.matches || []),
  ]
}

function matchTimestamp(match, tournament) {
  const raw = match.createdAt || tournament.date
  const t = raw ? Date.parse(raw) : NaN
  return Number.isNaN(t) ? 0 : t
}

// ─── Player match index ───────────────────────────────────────────────────────

/**
 * Chronological per-player match list — the shared backbone for streaks,
 * the activity feed, and the player stats sheet.
 *
 * @returns {Map<playerId, Array<{ match, teamId, opponentTeamId, won,
 *           tournamentId, tournamentName, date, ts }>>} ascending by time
 */
export function buildPlayerMatchIndex(league) {
  const index = new Map()
  for (const p of league.players || []) index.set(p.id, [])

  for (const tournament of league.tournaments || []) {
    const teams = tournament.teams || []
    for (const match of allTournamentMatches(tournament)) {
      if (!match.played || !match.winner) continue
      const ts = matchTimestamp(match, tournament)
      for (const team of teams) {
        if (match.team1 !== team.id && match.team2 !== team.id) continue
        const opponentTeamId = match.team1 === team.id ? match.team2 : match.team1
        for (const pid of team.players || []) {
          index.get(pid)?.push({
            match,
            teamId:         team.id,
            opponentTeamId,
            won:            match.winner === team.id,
            tournamentId:   tournament.id,
            tournamentName: tournament.name,
            date:           match.createdAt || tournament.date,
            ts,
          })
        }
      }
    }
  }

  for (const list of index.values()) list.sort((a, b) => a.ts - b.ts)
  return index
}

// ─── ELO timelines ────────────────────────────────────────────────────────────

/**
 * Adapt one normalized tournament to the DB-row shapes simulateTournamentElo
 * expects, replaying the exact match ordering used by processTournamentElo
 * (group first by id, knockout by round order, rest by id).
 */
function adaptTournamentForElo(tournament, runningElos, names) {
  const rows = []

  for (const g of tournament.groups || []) {
    for (const m of g.matches || []) {
      rows.push({ ...toEloRow(m), source_type: 'group' })
    }
  }
  ;(tournament.knockout?.rounds || []).forEach((r, i) => {
    for (const m of r.matches || []) {
      rows.push({
        ...toEloRow(m),
        source_type: 'knockout',
        knockout_rounds: { sort_order: i, round_key: r.id },
      })
    }
  })
  for (const m of tournament.matches || []) {
    rows.push({ ...toEloRow(m), source_type: 'freeplay' })
  }

  // Same comparator as processTournamentElo in tournamentService.js
  rows.sort((a, b) => {
    if (a.source_type === 'group' && b.source_type !== 'group') return -1
    if (a.source_type !== 'group' && b.source_type === 'group') return 1
    if (a.source_type === 'knockout' && b.source_type === 'knockout') {
      const orderA = a.knockout_rounds?.sort_order ?? 999
      const orderB = b.knockout_rounds?.sort_order ?? 999
      return orderA - orderB
    }
    return String(a.id).localeCompare(String(b.id))
  })

  const teamPlayers = (tournament.teams || []).flatMap(t =>
    (t.players || []).map(pid => ({ team_id: t.id, player_id: pid }))
  )

  const players = {}
  for (const tp of teamPlayers) {
    if (!players[tp.player_id]) {
      players[tp.player_id] = {
        elo:         runningElos[tp.player_id] ?? BASE_ELO,
        displayName: names[tp.player_id] || 'Unknown',
      }
    }
  }

  return { matches: rows, teamPlayers, players }
}

function toEloRow(m) {
  return {
    id:        m.id,
    team1_id:  m.team1,
    team2_id:  m.team2,
    winner_id: m.winner,
    played:    m.played,
  }
}

/**
 * Reconstruct per-player ELO trajectories by replaying every elo_processed
 * tournament from the 1000 baseline (no snapshots exist in the DB — the
 * server only persists the final players.elo). Each curve is then anchored
 * so its endpoint equals the player's real current elo; the constant offset
 * absorbs manual edits and pre-existing ratings.
 *
 * @returns {{
 *   snapshots: Array<{ tournamentId, name, date }>,
 *   byPlayer:  Map<playerId, Array<{ tournamentId: string|null, elo: number }>>,
 *   ranks:     Array<Map<playerId, number>>,
 * }}
 */
export function computeEloTimelines(league) {
  const players   = league.players || []
  const processed = (league.tournaments || []).filter(t => t.elo_processed)

  const names   = {}
  const running = {}
  for (const p of players) {
    names[p.id]   = playerLabel(p)
    running[p.id] = BASE_ELO
  }

  const snapshots = []
  const byPlayer  = new Map(players.map(p => [p.id, [{ tournamentId: null, elo: BASE_ELO }]]))

  for (const tournament of processed) {
    const { matches, teamPlayers, players: simPlayers } =
      adaptTournamentForElo(tournament, running, names)
    const { finalRatings } = simulateTournamentElo(matches, teamPlayers, simPlayers)
    for (const [pid, elo] of Object.entries(finalRatings)) {
      if (pid in running) running[pid] = elo
    }
    snapshots.push({ tournamentId: tournament.id, name: tournament.name, date: tournament.date })
    for (const p of players) {
      byPlayer.get(p.id).push({ tournamentId: tournament.id, elo: running[p.id] })
    }
  }

  // Anchor each curve to the player's real current elo
  for (const p of players) {
    const curve  = byPlayer.get(p.id)
    const offset = (p.elo ?? BASE_ELO) - curve[curve.length - 1].elo
    if (offset !== 0) {
      byPlayer.set(p.id, curve.map(pt => ({ ...pt, elo: pt.elo + offset })))
    }
  }

  // Rank every league player at each snapshot (post-anchoring)
  const ranks = snapshots.map((_, i) => {
    const sorted = [...players].sort(
      (a, b) => byPlayer.get(b.id)[i + 1].elo - byPlayer.get(a.id)[i + 1].elo
    )
    return new Map(sorted.map((p, rank) => [p.id, rank + 1]))
  })

  return { snapshots, byPlayer, ranks }
}

/**
 * Rank movement between the two most recent ELO snapshots.
 * @returns {{ now: number, prev: number, delta: number } | null}
 *   delta > 0 means the player moved up.
 */
export function computeRankMovement(timelines, playerId) {
  const { ranks } = timelines
  if (ranks.length < 2) return null
  const now  = ranks[ranks.length - 1].get(playerId)
  const prev = ranks[ranks.length - 2].get(playerId)
  if (now == null || prev == null) return null
  return { now, prev, delta: prev - now }
}

// ─── Streaks ──────────────────────────────────────────────────────────────────

/**
 * Win/loss aggregates per player from the chronological match index.
 * `current` is the active win streak (0 if the last match was a loss);
 * `last5` lists the most recent results, oldest first.
 *
 * @returns {Map<playerId, { wins, losses, winPct, current, best, last5 }>}
 */
export function computeStreaks(matchIndex) {
  const out = new Map()
  for (const [pid, entries] of matchIndex) {
    let wins = 0
    let losses = 0
    let current = 0
    let best = 0
    for (const e of entries) {
      if (e.won) {
        wins++
        current++
        if (current > best) best = current
      } else {
        losses++
        current = 0
      }
    }
    const total = wins + losses
    out.set(pid, {
      wins,
      losses,
      winPct:  total > 0 ? wins / total : 0,
      current,
      best,
      last5:   entries.slice(-5).map(e => (e.won ? 'W' : 'L')),
    })
  }
  return out
}

// ─── Podiums / champions ──────────────────────────────────────────────────────

/**
 * Resolve the 1st/2nd/3rd team ids of a completed tournament: knockout final
 * and third-place results first, then winnerTeamId, then points/wins fallback.
 * @returns {{ firstTeamId, secondTeamId, thirdTeamId } | null}
 */
export function getPodiumTeams(t) {
  if (t.status !== 'completed') return null

  let firstTeamId = null
  let secondTeamId = null
  let thirdTeamId = null
  const teams = t.teams || []

  // 1. Try Knockout final and third place matches
  const ko = t.knockout?.rounds
  if (ko) {
    const finalRound = ko.find(r => r.id === 'final')
    if (finalRound?.matches?.length) {
      const match = finalRound.matches[0]
      if (match.played && match.winner) {
        firstTeamId = match.winner
        secondTeamId = match.winner === match.team1 ? match.team2 : match.team1
      }
    }
    const thirdRound = ko.find(r => r.id === 'third_place')
    if (thirdRound?.matches?.length) {
      const match = thirdRound.matches[0]
      if (match.played && match.winner) {
        thirdTeamId = match.winner
      }
    }
  }

  // 2. Fallback to winnerTeamId if not found from KO
  if (!firstTeamId && t.winnerTeamId) {
    firstTeamId = t.winnerTeamId
  }

  // 3. Fallback to points/wins if not fully decided by KO
  if (!firstTeamId && teams.length > 0) {
    const sorted = [...teams].sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0)
      return (b.wins || 0) - (a.wins || 0)
    })
    firstTeamId = sorted[0]?.id
    secondTeamId = sorted[1]?.id
    thirdTeamId = sorted[2]?.id
  } else if (firstTeamId && (!secondTeamId || !thirdTeamId) && teams.length > 1) {
    const remaining = teams.filter(tm => tm.id !== firstTeamId && tm.id !== secondTeamId).sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0)
      return (b.wins || 0) - (a.wins || 0)
    })
    if (!secondTeamId) secondTeamId = remaining[0]?.id
    if (!thirdTeamId && remaining.length > (secondTeamId ? 1 : 0)) {
      thirdTeamId = remaining[secondTeamId ? 1 : 0]?.id
    }
  }

  if (!firstTeamId && !secondTeamId && !thirdTeamId) return null
  return { firstTeamId, secondTeamId, thirdTeamId }
}

/**
 * Human-readable podium of a completed tournament (used by tournament cards).
 * @returns {{ first, second, third } | null} — "Team (Player, Player)" strings
 */
export function getTournamentPodium(t, leaguePlayers = []) {
  const podium = getPodiumTeams(t)
  if (!podium) return null
  const teams = t.teams || []

  const formatTeam = (teamId) => {
    if (!teamId) return null
    const team = teams.find(tm => tm.id === teamId)
    if (!team) return null
    const pNames = (team.players || []).map(pid => {
      const p = leaguePlayers.find(lp => lp.id === pid)
      return p ? (p.displayName || p.name) : 'Unknown'
    }).join(', ')
    return pNames ? `${team.name} (${pNames})` : team.name
  }

  const result = {
    first:  formatTeam(podium.firstTeamId),
    second: formatTeam(podium.secondTeamId),
    third:  formatTeam(podium.thirdTeamId),
  }

  if (!result.first && !result.second && !result.third) return null
  return result
}

/**
 * Champions wall: reigning champion (most recent completed tournament with a
 * winner) plus per-player title and podium counts across the league history.
 *
 * @returns {{
 *   reigning: { tournamentId, tournamentName, date, teamName, playerIds, playerNames } | null,
 *   titles:   Array<{ playerId, name, titles, podiums }>,  // titles desc
 * }}
 */
export function computeChampions(league) {
  const players   = league.players || []
  const completed = (league.tournaments || []).filter(t => t.status === 'completed')

  const counts = new Map() // pid → { titles, podiums }
  let reigning = null

  for (const tournament of completed) {
    const podium = getPodiumTeams(tournament)
    if (!podium) continue
    const teams = tournament.teams || []

    const teamPlayers = (teamId) =>
      teams.find(tm => tm.id === teamId)?.players || []

    for (const [slot, teamId] of [
      ['first', podium.firstTeamId],
      ['second', podium.secondTeamId],
      ['third', podium.thirdTeamId],
    ]) {
      if (!teamId) continue
      for (const pid of teamPlayers(teamId)) {
        const c = counts.get(pid) || { titles: 0, podiums: 0 }
        c.podiums++
        if (slot === 'first') c.titles++
        counts.set(pid, c)
      }
    }

    // completed tournaments come in chronological order — keep the latest
    if (podium.firstTeamId) {
      const team = teams.find(tm => tm.id === podium.firstTeamId)
      const playerIds = team?.players || []
      reigning = {
        tournamentId:   tournament.id,
        tournamentName: tournament.name,
        date:           tournament.date,
        teamName:       team?.name || 'Unknown',
        playerIds,
        playerNames:    playerIds
          .map(pid => playerLabel(players.find(p => p.id === pid)))
          .join(', '),
      }
    }
  }

  const titles = players
    .map(p => ({ playerId: p.id, name: playerLabel(p), ...(counts.get(p.id) || { titles: 0, podiums: 0 }) }))
    .filter(r => r.titles > 0)
    .sort((a, b) => b.titles - a.titles || b.podiums - a.podiums)

  return { reigning, titles }
}

// ─── Stat highlights ──────────────────────────────────────────────────────────

/** Total points scored minus conceded for one match-index entry. */
function entryPointDiff(e) {
  const { match, teamId } = e
  const isTeam1 = match.team1 === teamId
  if (Array.isArray(match.sets) && match.sets.length > 0) {
    let pf = 0
    let pa = 0
    for (const s of match.sets) {
      pf += isTeam1 ? (s.s1 || 0) : (s.s2 || 0)
      pa += isTeam1 ? (s.s2 || 0) : (s.s1 || 0)
    }
    return pf - pa
  }
  const pf = isTeam1 ? (match.score1 || 0) : (match.score2 || 0)
  const pa = isTeam1 ? (match.score2 || 0) : (match.score1 || 0)
  return pf - pa
}

/**
 * Headline stat tiles for the horizontal highlights strip. Tiles whose
 * conditions aren't met are omitted — the result may be empty.
 *
 * @returns {Array<{ id, label, playerId, playerName, primary, secondary }>}
 */
export function computeStatHighlights(league, { timelines, streaks, champions, pointDiffs, minMatches = 5 }) {
  const players = league.players || []
  const byId    = new Map(players.map(p => [p.id, p]))
  const tiles   = []

  const best = (iterable, score) => {
    let top = null
    let topScore = -Infinity
    for (const item of iterable) {
      const s = score(item)
      if (s > topScore) { topScore = s; top = item }
    }
    return top
  }

  // On fire — longest active win streak (min 2)
  const fire = best(streaks.entries(), ([, s]) => s.current)
  if (fire && fire[1].current >= 2) {
    tiles.push({
      id:         'onFire',
      label:      'On fire',
      playerId:   fire[0],
      playerName: playerLabel(byId.get(fire[0])),
      primary:    `${fire[1].current}`,
      secondary:  'win streak',
    })
  }

  // Best win % — players with enough matches
  const eligible = [...streaks.entries()].filter(([, s]) => s.wins + s.losses >= minMatches)
  const sharp = best(eligible, ([, s]) => s.winPct)
  if (sharp && sharp[1].winPct > 0) {
    tiles.push({
      id:         'bestWinPct',
      label:      'Best win %',
      playerId:   sharp[0],
      playerName: playerLabel(byId.get(sharp[0])),
      primary:    `${Math.round(sharp[1].winPct * 100)}%`,
      secondary:  `${sharp[1].wins}W - ${sharp[1].losses}L`,
    })
  }

  // Most improved — biggest ELO gain over the last processed tournament
  if (timelines.snapshots.length >= 2) {
    const deltas = players.map(p => {
      const curve = timelines.byPlayer.get(p.id)
      return { p, delta: curve[curve.length - 1].elo - curve[curve.length - 2].elo }
    })
    const climber = best(deltas, d => d.delta)
    if (climber && climber.delta > 0) {
      tiles.push({
        id:         'mostImproved',
        label:      'Climbing',
        playerId:   climber.p.id,
        playerName: playerLabel(climber.p),
        primary:    `+${climber.delta}`,
        secondary:  'ELO last event',
      })
    }
  }

  // Point machine — best cumulative point differential
  let topDiff = null
  for (const [pid, diff] of pointDiffs) {
    if (diff > 0 && (!topDiff || diff > topDiff.diff)) topDiff = { pid, diff }
  }
  if (topDiff) {
    tiles.push({
      id:         'pointDiff',
      label:      'Point machine',
      playerId:   topDiff.pid,
      playerName: playerLabel(byId.get(topDiff.pid)),
      primary:    `+${topDiff.diff}`,
      secondary:  'point diff',
    })
  }

  // Most titles — top of the champions wall
  const champ = champions.titles[0]
  if (champ && champ.titles >= 1) {
    tiles.push({
      id:         'mostTitles',
      label:      'Most titles',
      playerId:   champ.playerId,
      playerName: champ.name,
      primary:    `${champ.titles}`,
      secondary:  champ.titles === 1 ? 'tournament won' : 'tournaments won',
    })
  }

  // Hot hand — top scorer of the tournament currently live (min 3 points)
  const live = (league.tournaments || []).filter(
    t => t.status !== 'completed' && ['group', 'knockout', 'freeplay'].includes(t.phase)
  )
  if (live.length > 0) {
    const liveStats = computePlayerStats(live.flatMap(allTournamentMatches))
    const hot = best(Object.entries(liveStats), ([, s]) => s.points)
    if (hot && hot[1].points >= 3 && byId.has(hot[0])) {
      tiles.unshift({
        id:         'hotHand',
        label:      'Hot hand',
        playerId:   hot[0],
        playerName: playerLabel(byId.get(hot[0])),
        primary:    `${hot[1].points}`,
        secondary:  'pts in live event',
      })
    }
  }

  return tiles
}

/**
 * Cumulative point differential per player from the match index.
 * @returns {Map<playerId, number>}
 */
export function computePointDiffs(matchIndex) {
  const out = new Map()
  for (const [pid, entries] of matchIndex) {
    out.set(pid, entries.reduce((sum, e) => sum + entryPointDiff(e), 0))
  }
  return out
}

// ─── League leaders ───────────────────────────────────────────────────────────

/**
 * League-wide per-player action stats aggregated from every tournament's
 * point logs — completed AND live tournaments alike (only played matches
 * carry a log, so in-progress events contribute what's been played so far).
 *
 * Matches scored without player attribution (scoring level 1) simply have no
 * log entries and drop out; categories with no data render nothing upstream.
 *
 * @returns {{ [playerId]: { points, aces, spikes, blocks, tips, errors,
 *             serves, serveWins, serveWinPct, net } }}
 */
export function computeLeagueLeaderStats(league) {
  const allMatches = (league.tournaments || []).flatMap(allTournamentMatches)
  return computePlayerStats(allMatches)
}

// ─── League records ───────────────────────────────────────────────────────────

/**
 * All-time league records across every tournament (completed and live):
 * biggest blowout, closest match, longest win streak, and the most points
 * scored by one player in a single match.
 *
 * @returns {{
 *   biggestBlowout: { tournamentId, tournamentName, winnerLabel, loserLabel, winnerScore, loserScore, diff } | null,
 *   closestMatch:   { tournamentId, tournamentName, team1Label, team2Label, score1, score2, diff } | null,
 *   bestStreak:     { playerId, name, streak } | null,
 *   bestSingleMatch:{ playerId, name, points, tournamentId, tournamentName } | null,
 * }}
 */
export function computeLeagueRecords(league, streaks) {
  const players = league.players || []
  const nameOf = (pid) => playerLabel(players.find(p => p.id === pid))

  let biggestBlowout = null
  let closestMatch = null
  let bestSingleMatch = null

  for (const tournament of league.tournaments || []) {
    const teams = tournament.teams || []
    const teamLabel = (teamId) => {
      const team = teams.find(tm => tm.id === teamId)
      const names = (team?.players || []).map(nameOf).join(' & ')
      return names || team?.name || 'Unknown'
    }

    for (const match of allTournamentMatches(tournament)) {
      if (!match.played || !match.winner) continue
      const diff = Math.abs((match.score1 || 0) - (match.score2 || 0))
      const winnerIs1 = match.winner === match.team1

      if (!biggestBlowout || diff > biggestBlowout.diff) {
        biggestBlowout = {
          tournamentId:   tournament.id,
          tournamentName: tournament.name,
          winnerLabel:    teamLabel(match.winner),
          loserLabel:     teamLabel(winnerIs1 ? match.team2 : match.team1),
          winnerScore:    winnerIs1 ? match.score1 : match.score2,
          loserScore:     winnerIs1 ? match.score2 : match.score1,
          diff,
        }
      }
      if (!closestMatch || diff < closestMatch.diff) {
        closestMatch = {
          tournamentId:   tournament.id,
          tournamentName: tournament.name,
          team1Label:     teamLabel(match.team1),
          team2Label:     teamLabel(match.team2),
          score1:         match.score1,
          score2:         match.score2,
          diff,
        }
      }

      // Most points by one player in a single match (needs a point log)
      if (match.log?.length) {
        const perPlayer = {}
        for (const entry of match.log) {
          if (entry.scoringPlayerId) {
            perPlayer[entry.scoringPlayerId] = (perPlayer[entry.scoringPlayerId] || 0) + 1
          }
        }
        for (const [pid, points] of Object.entries(perPlayer)) {
          if (!bestSingleMatch || points > bestSingleMatch.points) {
            bestSingleMatch = {
              playerId:       pid,
              name:           nameOf(pid),
              points,
              tournamentId:   tournament.id,
              tournamentName: tournament.name,
            }
          }
        }
      }
    }
  }

  // Longest win streak ever (min 2 so a single win doesn't read as a streak)
  let bestStreak = null
  for (const [pid, s] of streaks) {
    if (s.best >= 2 && (!bestStreak || s.best > bestStreak.streak)) {
      bestStreak = { playerId: pid, name: nameOf(pid), streak: s.best }
    }
  }

  if (!biggestBlowout && !closestMatch && !bestStreak && !bestSingleMatch) return null
  return { biggestBlowout, closestMatch, bestStreak, bestSingleMatch }
}

// ─── Activity feed ────────────────────────────────────────────────────────────

/**
 * Most recent played matches across all tournaments, newest first.
 *
 * @returns {Array<{ matchId, tournamentId, tournamentName, date, ts,
 *   team1: { name, playerNames }, team2: { name, playerNames },
 *   score1, score2, sets, winnerSide: 1|2 }>}
 */
export function buildActivityFeed(league, limit = 12) {
  const players = league.players || []
  const nameOf = (pid) => playerLabel(players.find(p => p.id === pid))

  const items = []
  for (const tournament of league.tournaments || []) {
    const teams = tournament.teams || []
    const teamInfo = (teamId) => {
      const team = teams.find(tm => tm.id === teamId)
      return {
        name:        team?.name || 'Unknown',
        playerNames: (team?.players || []).map(nameOf).join(', '),
      }
    }
    for (const match of allTournamentMatches(tournament)) {
      if (!match.played || !match.winner) continue
      items.push({
        matchId:        match.id,
        tournamentId:   tournament.id,
        tournamentName: tournament.name,
        date:           match.createdAt || tournament.date,
        ts:             matchTimestamp(match, tournament),
        team1:          teamInfo(match.team1),
        team2:          teamInfo(match.team2),
        score1:         match.score1,
        score2:         match.score2,
        sets:           Array.isArray(match.sets) ? match.sets : null,
        winnerSide:     match.winner === match.team1 ? 1 : 2,
      })
    }
  }

  items.sort((a, b) => b.ts - a.ts)
  return items.slice(0, limit)
}

// ─── One-shot aggregate ───────────────────────────────────────────────────────

/**
 * Compute everything the Rankings feed needs in one pass, so the tab can hold
 * a single useMemo over the league object.
 */
export function computeLeagueInsights(league) {
  const matchIndex  = buildPlayerMatchIndex(league)
  const timelines   = computeEloTimelines(league)
  const streaks     = computeStreaks(matchIndex)
  const champions   = computeChampions(league)
  const pointDiffs  = computePointDiffs(matchIndex)
  const highlights  = computeStatHighlights(league, { timelines, streaks, champions, pointDiffs })
  const leaderStats = computeLeagueLeaderStats(league)
  const records     = computeLeagueRecords(league, streaks)

  return {
    matchIndex,
    timelines,
    streaks,
    champions,
    highlights,
    leaderStats,
    records,
    feed: buildActivityFeed(league),
  }
}
