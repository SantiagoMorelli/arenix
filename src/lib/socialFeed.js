/**
 * socialFeed — turns a league into a chronological "post" stream for the
 * experimental social view (`/league/:id/social`).
 *
 * Pure: no React, no Supabase. Everything is derived from the league object
 * plus the already-computed `leagueInsights` aggregate, so the social view
 * costs no extra queries and can never disagree with the classic Rankings tab.
 *
 * Post kinds
 *   live      — a tournament currently in progress (always pinned to the top)
 *   champion  — a completed tournament, with its winning team
 *   match     — a played match result
 *   spotlight — a stat highlight about one player (streak, climb, titles, …)
 *   record    — an all-time league record
 *
 * Chronological posts (live / champion / match) carry a real timestamp and are
 * sorted newest first. Spotlight and record posts have no meaningful date, so
 * they are spliced into the stream at a fixed cadence — the way a social feed
 * interleaves suggested content between real posts.
 */
import { getPodiumTeams } from './leagueInsights'

/** One spotlight/record card for every this-many chronological posts. */
const SPOTLIGHT_EVERY = 3

/** Phases that mean "a tournament is actually being played right now". */
const LIVE_PHASES = ['group', 'knockout', 'freeplay']

function playerLabel(p) {
  return p?.displayName || p?.name || 'Unknown'
}

/**
 * Human "time ago" label, social-feed style: 45m, 3h, 2d, then a date.
 * @param {number} ts epoch millis
 */
export function relativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 0) return 'now'
  const min = Math.floor(diff / 60000)
  if (min < 1)  return 'now'
  if (min < 60) return `${min}m`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Post builders ────────────────────────────────────────────────────────────

function livePosts(league) {
  return (league.tournaments || [])
    .filter(t => t.status !== 'completed' && LIVE_PHASES.includes(t.phase))
    .reverse()
    .map((t, i) => ({
      id:   `live-${t.id}`,
      kind: 'live',
      // Pinned above everything else, newest live event first.
      ts:   Number.MAX_SAFE_INTEGER - i,
      tournamentId:   t.id,
      tournamentName: t.name,
      teamCount:      (t.teams || []).length,
      playerCount:    new Set((t.teams || []).flatMap(tm => tm.players || [])).size,
    }))
}

function championPosts(league) {
  const players = league.players || []
  const posts = []

  for (const t of league.tournaments || []) {
    if (t.status !== 'completed') continue
    const podium = getPodiumTeams(t)
    if (!podium?.firstTeamId) continue

    const team = (t.teams || []).find(tm => tm.id === podium.firstTeamId)
    const playerIds = team?.players || []
    const ts = t.date ? Date.parse(t.date) : NaN

    posts.push({
      id:   `champ-${t.id}`,
      kind: 'champion',
      ts:   Number.isNaN(ts) ? 0 : ts,
      tournamentId:   t.id,
      tournamentName: t.name,
      teamName:       team?.name || 'Unknown',
      playerIds,
      playerNames:    playerIds.map(pid => playerLabel(players.find(p => p.id === pid))).join(' & '),
      teamCount:      (t.teams || []).length,
    })
  }
  return posts
}

function matchPosts(feed) {
  return feed.map(item => ({
    id:   `match-${item.matchId}`,
    kind: 'match',
    ts:   item.ts,
    ...item,
  }))
}

function spotlightPosts(highlights) {
  return (highlights || []).map(tile => ({
    id:   `spot-${tile.id}`,
    kind: 'spotlight',
    tile,
  }))
}

function recordPosts(records) {
  if (!records) return []
  const out = []
  const { biggestBlowout, closestMatch, bestStreak, bestSingleMatch } = records

  if (biggestBlowout) {
    out.push({
      id:    'rec-blowout',
      kind:  'record',
      label: 'Biggest blowout',
      headline: `${biggestBlowout.winnerScore}-${biggestBlowout.loserScore}`,
      primaryLabel: biggestBlowout.winnerLabel,
      detail: `beat ${biggestBlowout.loserLabel} · ${biggestBlowout.tournamentName}`,
      tournamentId: biggestBlowout.tournamentId,
    })
  }
  if (closestMatch && closestMatch.diff <= 2) {
    out.push({
      id:    'rec-closest',
      kind:  'record',
      label: 'Closest match ever',
      headline: `${closestMatch.score1}-${closestMatch.score2}`,
      primaryLabel: `${closestMatch.team1Label} vs ${closestMatch.team2Label}`,
      detail: closestMatch.tournamentName,
      tournamentId: closestMatch.tournamentId,
    })
  }
  if (bestSingleMatch) {
    out.push({
      id:    'rec-single',
      kind:  'record',
      label: 'Most points in a match',
      headline: `${bestSingleMatch.points}`,
      primaryLabel: bestSingleMatch.name,
      detail: bestSingleMatch.tournamentName,
      playerId: bestSingleMatch.playerId,
      tournamentId: bestSingleMatch.tournamentId,
    })
  }
  if (bestStreak) {
    out.push({
      id:    'rec-streak',
      kind:  'record',
      label: 'Longest win streak',
      headline: `${bestStreak.streak}`,
      primaryLabel: bestStreak.name,
      detail: 'consecutive wins',
      playerId: bestStreak.playerId,
    })
  }
  return out
}

// ─── Assembly ─────────────────────────────────────────────────────────────────

/**
 * Build the full social feed.
 *
 * @param {object} league    full league object from useLeague
 * @param {object} insights  result of computeLeagueInsights(league)
 * @returns {Array<object>}  posts, newest first, with spotlights interleaved
 */
export function buildSocialFeed(league, insights) {
  const chronological = [
    ...livePosts(league),
    ...championPosts(league),
    ...matchPosts(insights?.feed || []),
  ].sort((a, b) => b.ts - a.ts)

  const interstitials = [
    ...spotlightPosts(insights?.highlights),
    ...recordPosts(insights?.records),
  ]

  // Splice one interstitial after every SPOTLIGHT_EVERY chronological posts.
  const out = []
  let next = 0
  chronological.forEach((post, i) => {
    out.push(post)
    const boundary = (i + 1) % SPOTLIGHT_EVERY === 0
    if (boundary && next < interstitials.length) out.push(interstitials[next++])
  })
  // Anything left over (short feed, many highlights) tails the stream.
  out.push(...interstitials.slice(next))

  return out
}

/**
 * Players ordered for the story rail: the viewer first (so their own ring is
 * always reachable with a thumb), then everyone else by ELO.
 *
 * @returns {Array<{ player, rank, streak, isMe }>}
 */
export function buildStoryRail(league, insights, currentUserId) {
  const ranked = [...(league.players || [])]
    .sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000))
    .map((player, i) => ({
      player,
      rank:   i + 1,
      streak: insights?.streaks?.get(player.id) || null,
      isMe:   Boolean(currentUserId && player.userId === currentUserId),
    }))

  const meIndex = ranked.findIndex(e => e.isMe)
  if (meIndex > 0) ranked.unshift(...ranked.splice(meIndex, 1))
  return ranked
}
