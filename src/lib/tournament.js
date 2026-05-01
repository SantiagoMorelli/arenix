import { uid } from './utils'
import { applyH2HTieBreakers } from './standings'

// ─── Basic lookup ──────────────────────────────────────────────────────────────
export function teamName(teams, id) {
  return teams.find(t => t.id === id)?.name || '?'
}

// ─── Head-to-head stats between two teams ─────────────────────────────────────
export function h2hStats(idA, idB, matches) {
  const s = { [idA]: { pts: 0, gd: 0 }, [idB]: { pts: 0, gd: 0 } }
  ;(matches || [])
    .filter(m => m.played &&
      ((m.team1 === idA && m.team2 === idB) || (m.team1 === idB && m.team2 === idA)))
    .forEach(m => {
      const [s1, s2] = [m.score1, m.score2]
      s[m.team1].gd += s1 - s2; s[m.team2].gd += s2 - s1
      if (s1 > s2) s[m.team1].pts += 1; else s[m.team2].pts += 1 // W=1, L=0
    })
  return s
}

// ─── Standings calculator (group, legacy-compatible) ──────────────────────────
export function calcStandings(group, options = {}) {
  const rows = group.teamIds.map(teamId => {
    let mp = 0, pf = 0, pa = 0, played = 0, wins = 0, losses = 0
    ;(group.matches || [])
      .filter(m => m.played && (m.team1 === teamId || m.team2 === teamId))
      .forEach(m => {
        played++
        const isT1 = m.team1 === teamId
        const scored   = isT1 ? m.score1 : m.score2
        const conceded = isT1 ? m.score2 : m.score1
        pf += scored; pa += conceded
        if (scored > conceded) { mp += 1; wins++ }
        else                   {          losses++ }
      })
    return { teamId, played, wins, losses, pf, pa, pd: pf - pa, mp }
  }).sort((a, b) => b.mp - a.mp)

  // Re-map to the shape expected by applyH2HTieBreakers (id/pts) then map back.
  const normalised = rows.map(r => ({ ...r, id: r.teamId, pts: r.mp }))
  return applyH2HTieBreakers(normalised, group.matches || [], options).map(r => {
    const { id, pts, ...rest } = r // eslint-disable-line no-unused-vars
    return rest
  })
}

// ─── Knockout bracket builder ─────────────────────────────────────────────────
export function buildKnockout(groups, options = {}) {
  const qualifiers = groups.flatMap((g, gi) => {
    const standings = calcStandings(g, options)
    return standings.slice(0, 2).map((s, pos) => ({ teamId: s.teamId, position: pos, groupIdx: gi }))
  })

  const n = groups.length
  const firstPlace  = qualifiers.filter(q => q.position === 0)
  const secondPlace = qualifiers.filter(q => q.position === 1)

  const firstRoundMatches = firstPlace.map((fp, i) => ({
    id: uid(),
    team1: fp.teamId,
    team2: secondPlace[(i + 1) % n].teamId,
    played: false, winner: null, score1: 0, score2: 0,
  }))

  const totalQualifiers = firstRoundMatches.length * 2

  const rounds = []
  const firstRoundName =
    totalQualifiers >= 16 ? 'Round of 16' :
    totalQualifiers >= 8  ? 'Quarter-finals' :
    'Semi-finals'

  let currentMatches = firstRoundMatches
  let currentId = totalQualifiers >= 16 ? 'r16' : totalQualifiers >= 8 ? 'qf' : 'semi'
  let currentName = firstRoundName

  while (currentMatches.length > 1) {
    rounds.push({ id: currentId, name: currentName, matches: currentMatches })
    const nextCount = Math.ceil(currentMatches.length / 2)
    const nextMatches = Array.from({ length: nextCount }, () => ({
      id: uid(), team1: null, team2: null, played: false, winner: null, score1: 0, score2: 0,
    }))
    currentMatches = nextMatches
    if (currentId === 'r16')    { currentId = 'qf';    currentName = 'Quarter-finals' }
    else if (currentId === 'qf') { currentId = 'semi';  currentName = 'Semi-finals' }
    else                         { currentId = 'final'; currentName = 'Final'; break }
  }

  const finalMatch = {
    id: uid(), team1: null, team2: null, played: false, winner: null, score1: 0, score2: 0,
  }
  rounds.push({ id: 'final', name: 'Final', matches: [finalMatch] })

  const thirdMatch = {
    id: uid(), team1: null, team2: null, played: false, winner: null, score1: 0, score2: 0,
  }
  rounds.push({ id: 'third_place', name: '3rd Place', matches: [thirdMatch] })

  return { rounds }
}

// ─── Group standings (enriched with player names) ─────────────────────────────
export function calcGroupStandings(group, teams, players = [], options = {}) {
  const rows = group.teamIds.map(teamId => {
    let wins = 0, losses = 0, pf = 0, pa = 0
    group.matches
      .filter(m => m.played && (m.team1 === teamId || m.team2 === teamId))
      .forEach(m => {
        const scored   = m.team1 === teamId ? m.score1 : m.score2
        const conceded = m.team1 === teamId ? m.score2 : m.score1
        pf += scored
        pa += conceded
        if (scored > conceded) wins++; else losses++
      })

    const t = teams.find(x => x.id === teamId)
    const playerNames = (t?.players || []).map(pid => {
      const p = players.find(x => x.id === pid)
      return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
    }).join(' · ')

    return { id: teamId, name: teamName(teams, teamId), playerNames, wins, losses, pf, pa, pd: pf - pa, pts: wins }
  }).sort((a, b) => b.pts - a.pts)
  return applyH2HTieBreakers(rows, group.matches || [], options)
}

// ─── Overall standings across all teams ───────────────────────────────────────
export function calcOverallStandings(teams, matches, players = [], options = {}) {
  const pool = matches || []
  const rows = teams.map(tm => {
    let wins = 0, losses = 0, pf = 0, pa = 0
    pool
      .filter(m => m.played && (m.team1 === tm.id || m.team2 === tm.id))
      .forEach(m => {
        const scored   = m.team1 === tm.id ? m.score1 : m.score2
        const conceded = m.team1 === tm.id ? m.score2 : m.score1
        pf += scored
        pa += conceded
        if (scored > conceded) wins++; else losses++
      })

    const playerNames = (tm.players || []).map(pid => {
      const p = players.find(x => x.id === pid)
      return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
    }).join(' · ')

    return { id: tm.id, name: tm.name, playerNames, wins, losses, pf, pa, pd: pf - pa, pts: wins }
  }).sort((a, b) => b.pts - a.pts)
  return applyH2HTieBreakers(rows, pool, options)
}

// ─── Flatten all matches across groups + knockout + freeplay ──────────────────
export function getAllMatches(tournament) {
  return [
    ...(tournament.groups || []).flatMap(g =>
      g.matches.map(m => ({ ...m, label: g.name }))
    ),
    ...(tournament.knockout?.rounds || []).flatMap(r =>
      r.matches.map(m => ({ ...m, label: roundLabel(r.id) }))
    ),
    ...(tournament.matches || []).map((m, i) => ({ ...m, label: `Match ${i + 1}` })),
  ]
}

// ─── Round label ──────────────────────────────────────────────────────────────
export function roundLabel(id) {
  return (
    { final: 'Final', semi: 'Semi-final', quarter: 'Quarter-final',
      third_place: '3rd Place', r16: 'Round of 16' }[id] || id
  )
}
