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

/* ─── Team standings over a flat list of matches ──────────────────────────── */
/**
 * Compute W/L/PF/PA/PD/PTS per team over the supplied matches.
 *   teams   — array of team objects
 *   matches — array of match objects (only `played` ones count)
 *   players — array of player objects (optional; used to build playerNames)
 * Returns array of rows sorted by PTS → PD → PF → Wins.
 */
export function calcOverallStandings(teams, matches, players = []) {
  return teams
    .map(tm => {
      let wins = 0,
        losses = 0,
        pf = 0,
        pa = 0
      ;(matches || [])
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
    .sort(
      (a, b) =>
        b.pts - a.pts || b.pd - a.pd || b.pf - a.pf || b.wins - a.wins
    )
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
