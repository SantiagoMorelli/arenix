/**
 * Shared standings math.
 * Used by tournament Positions tab and free-play Ranking tab.
 *
 * All functions are pure and operate on these generic shapes:
 *   team   = { id, name, players?: [playerId, ...], playerIds?: [...] }
 *   match  = { team1, team2, score1, score2, played }
 *   player = { id, name, displayName?, nickname? }
 *
 * Free-play sessions use team.playerIds; tournaments use team.players.
 * `getTeamPlayerIds` handles both transparently.
 */

function getTeamPlayerIds(team) {
  return team?.players ?? team?.playerIds ?? []
}

function playerDisplayName(p) {
  if (!p) return 'Unknown'
  return p.displayName || p.nickname || p.name || 'Unknown'
}

/* ─── Head-to-head between two teams ──────────────────────────────────────── */
export function h2hStats(idA, idB, matches) {
  const s = { [idA]: { pts: 0, gd: 0 }, [idB]: { pts: 0, gd: 0 } }
  ;(matches || [])
    .filter(
      m =>
        m.played &&
        ((m.team1 === idA && m.team2 === idB) ||
          (m.team1 === idB && m.team2 === idA))
    )
    .forEach(m => {
      const [s1, s2] = [m.score1, m.score2]
      s[m.team1].gd += s1 - s2
      s[m.team2].gd += s2 - s1
      if (s1 > s2) s[m.team1].pts += 1
      else s[m.team2].pts += 1
    })
  return s
}

/* ─── Mini-league h2h across a set of tied teams ──────────────────────────── */
/**
 * Compute head-to-head pts and gd for each team in `tiedIds`, but only
 * counting matches played exclusively between teams in that set.
 * Returns { [teamId]: { pts, gd } }.
 *
 * Used for 3+ way ties (mini-league / round-robin sub-table).
 */
export function h2hMiniLeague(tiedIds, matches) {
  const idSet = new Set(tiedIds)
  const stats = {}
  tiedIds.forEach(id => { stats[id] = { pts: 0, gd: 0 } })
  ;(matches || [])
    .filter(m => m.played && idSet.has(m.team1) && idSet.has(m.team2))
    .forEach(m => {
      const diff = m.score1 - m.score2
      stats[m.team1].gd += diff
      stats[m.team2].gd -= diff
      if (m.score1 > m.score2) stats[m.team1].pts += 1
      else stats[m.team2].pts += 1
    })
  return stats
}

/* ─── Re-sort equal-pts runs using head-to-head tie-breakers ──────────────── */
/**
 * Takes a rows array already sorted by pts desc, then re-sorts every run of
 * rows with equal pts using FIVB-style tie-breakers:
 *   h2h pts desc → h2h gd desc → pd desc → pf desc → wins desc
 *
 * Each row must have: { id, pts, pd, pf, wins }.
 * `matches` is the full pool of played matches used to compute h2h.
 *
 * Smoke scenarios (expected results):
 *   2-way tie: A beat B → A ranks above B regardless of PD.
 *   3-way acyclic: A>B, A>C, B>C  → A, B, C.
 *   3-way cycle (A>B, B>C, C>A, equal h2h gd): falls through to pd/pf.
 *   Tied teams that never faced each other: h2h pts/gd = 0, falls to pd/pf.
 */
export function applyH2HTieBreakers(rows, matches, options = {}) {
  const { tieBreakerMode = 'id', seedMap = {}, drawMap = {} } = options
  const out = [...rows]
  let i = 0
  while (i < out.length) {
    let j = i + 1
    while (j < out.length && out[j].pts === out[i].pts) j++
    // out[i..j-1] is a run of equal-pts rows
    if (j - i >= 2) {
      const run = out.slice(i, j)
      const tiedIds = run.map(r => r.id)
      const h2h = h2hMiniLeague(tiedIds, matches)
      run.sort((a, b) => {
        const diff = 
          (h2h[b.id].pts - h2h[a.id].pts) ||
          (h2h[b.id].gd  - h2h[a.id].gd)  ||
          (b.pd - a.pd)                     ||
          (b.pf - a.pf)                     ||
          (b.wins - a.wins)
        
        if (diff !== 0) return diff
        
        // Exact equality across all performance metrics.
        // Resolve using the final deterministic tie-breaker mode.
        if (tieBreakerMode === 'seed') {
          const sa = seedMap[a.id] ?? Infinity
          const sb = seedMap[b.id] ?? Infinity
          if (sa !== sb) return sa - sb
        }
        
        if (tieBreakerMode === 'draw') {
          const da = drawMap[a.id] ?? Infinity
          const db = drawMap[b.id] ?? Infinity
          if (da !== db) return da - db
        }
        
        // Fallback: 'name' or 'id' to guarantee determinism
        const nameA = a.name || ''
        const nameB = b.name || ''
        return nameA.localeCompare(nameB) || a.id.localeCompare(b.id)
      })
      out.splice(i, j - i, ...run)
    }
    i = j
  }
  return out
}

/* ─── Team standings over a flat list of matches ──────────────────────────── */
/**
 * Compute W/L/PF/PA/PD/PTS per team over the supplied matches.
 *   teams   — array of team objects
 *   matches — array of match objects (only `played` ones count)
 *   players — array of player objects (optional; used to build playerNames)
 * Returns array of rows sorted by PTS → H2H pts → H2H gd → PD → PF → Wins.
 */
export function calcOverallStandings(teams, matches, players = [], options = {}) {
  const pool = matches || []
  const rows = teams
    .map(tm => {
      let wins = 0,
        losses = 0,
        pf = 0,
        pa = 0
      pool
        .filter(m => m.played && (m.team1 === tm.id || m.team2 === tm.id))
        .forEach(m => {
          const scored = m.team1 === tm.id ? m.score1 : m.score2
          const conceded = m.team1 === tm.id ? m.score2 : m.score1
          pf += scored
          pa += conceded
          if (scored > conceded) wins++
          else losses++
        })

      const playerNames = getTeamPlayerIds(tm)
        .map(pid => playerDisplayName(players.find(x => x.id === pid)))
        .join(' · ')

      return {
        id: tm.id,
        name: tm.name,
        playerNames,
        wins,
        losses,
        pf,
        pa,
        pd: pf - pa,
        pts: wins,
      }
    })
    .sort((a, b) => b.pts - a.pts)
  return applyH2HTieBreakers(rows, pool, options)
}

/* ─── Player standings over a flat list of matches ────────────────────────── */
/**
 * Every player inherits their team's W/L for each match their team played.
 * Points = wins (1 per team win).
 * Returns array sorted by PTS → Wins → -Losses → name.
 */
export function calcPlayerStandings(teams, matches, players = []) {
  const playerStats = {}

  teams.forEach(team => {
    let wins = 0,
      losses = 0
    ;(matches || [])
      .filter(m => m.played && (m.team1 === team.id || m.team2 === team.id))
      .forEach(m => {
        const scored = m.team1 === team.id ? m.score1 : m.score2
        const conceded = m.team1 === team.id ? m.score2 : m.score1
        if (scored > conceded) wins++
        else losses++
      })

    getTeamPlayerIds(team).forEach(pid => {
      if (!playerStats[pid]) {
        const p = players.find(x => x.id === pid)
        playerStats[pid] = {
          id: pid,
          name: playerDisplayName(p),
          wins: 0,
          losses: 0,
          pts: 0,
        }
      }
      playerStats[pid].wins += wins
      playerStats[pid].losses += losses
      playerStats[pid].pts += wins
    })
  })

  return Object.values(playerStats).sort(
    (a, b) =>
      b.pts - a.pts ||
      b.wins - a.wins ||
      a.losses - b.losses ||
      a.name.localeCompare(b.name)
  )
}
