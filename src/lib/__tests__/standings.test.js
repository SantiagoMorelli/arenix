// Golden L3 characterization tests. DO NOT EDIT in Phases 5-7;
// ONLY EXTEND. If a phase requires you to change these, the
// refactor is wrong.

import { describe, it, expect } from 'vitest'
import {
  h2hStats,
  h2hMiniLeague,
  applyH2HTieBreakers,
  calcOverallStandings,
  calcPlayerStandings,
} from '../standings.js'

const teams = [
  { id: 'tA', name: 'Alpha', players: ['p1', 'p2'] },
  { id: 'tB', name: 'Beta',  players: ['p3', 'p4'] },
  { id: 'tC', name: 'Gamma', players: ['p5', 'p6'] },
]

const players = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
  { id: 'p4', name: 'Diana' },
  { id: 'p5', name: 'Eve' },
  { id: 'p6', name: 'Frank' },
]

// Round-robin: A beats B (7-5), A beats C (7-3), B beats C (7-4)
const matches = [
  { team1: 'tA', team2: 'tB', score1: 7, score2: 5, played: true, winner: 'tA' },
  { team1: 'tA', team2: 'tC', score1: 7, score2: 3, played: true, winner: 'tA' },
  { team1: 'tB', team2: 'tC', score1: 7, score2: 4, played: true, winner: 'tB' },
]

describe('h2hStats', () => {
  it('returns head-to-head pts and gd between two teams', () => {
    expect(h2hStats('tA', 'tB', matches)).toMatchInlineSnapshot(`
      {
        "tA": {
          "gd": 2,
          "pts": 1,
        },
        "tB": {
          "gd": -2,
          "pts": 0,
        },
      }
    `)
  })

  it('returns zeroes when no matches played between teams', () => {
    expect(h2hStats('tA', 'tB', [])).toMatchInlineSnapshot(`
      {
        "tA": {
          "gd": 0,
          "pts": 0,
        },
        "tB": {
          "gd": 0,
          "pts": 0,
        },
      }
    `)
  })
})

describe('h2hMiniLeague', () => {
  it('computes mini-league h2h for a 3-way tie set', () => {
    expect(h2hMiniLeague(['tA', 'tB', 'tC'], matches)).toMatchInlineSnapshot(`
      {
        "tA": {
          "gd": 6,
          "pts": 2,
        },
        "tB": {
          "gd": 1,
          "pts": 1,
        },
        "tC": {
          "gd": -7,
          "pts": 0,
        },
      }
    `)
  })

  it('returns zeroes for teams with no mutual matches', () => {
    expect(h2hMiniLeague(['tA', 'tB'], [])).toMatchInlineSnapshot(`
      {
        "tA": {
          "gd": 0,
          "pts": 0,
        },
        "tB": {
          "gd": 0,
          "pts": 0,
        },
      }
    `)
  })
})

describe('applyH2HTieBreakers', () => {
  it('re-sorts equal-pts runs by h2h then pd', () => {
    // Give tB and tC identical pts; tB beat tC so tB should rank above tC
    const rows = [
      { id: 'tA', name: 'Alpha', pts: 2, pd: 6, pf: 14, wins: 2 },
      { id: 'tB', name: 'Beta',  pts: 1, pd: 2, pf: 11, wins: 1 },
      { id: 'tC', name: 'Gamma', pts: 0, pd: -7, pf: 7, wins: 0 },
    ]
    expect(applyH2HTieBreakers(rows, matches)).toMatchInlineSnapshot(`
      [
        {
          "id": "tA",
          "name": "Alpha",
          "pd": 6,
          "pf": 14,
          "pts": 2,
          "wins": 2,
        },
        {
          "id": "tB",
          "name": "Beta",
          "pd": 2,
          "pf": 11,
          "pts": 1,
          "wins": 1,
        },
        {
          "id": "tC",
          "name": "Gamma",
          "pd": -7,
          "pf": 7,
          "pts": 0,
          "wins": 0,
        },
      ]
    `)
  })
})

describe('calcOverallStandings', () => {
  it('ranks teams by pts → h2h → pd', () => {
    expect(calcOverallStandings(teams, matches, players)).toMatchInlineSnapshot(`
      [
        {
          "id": "tA",
          "losses": 0,
          "name": "Alpha",
          "pa": 8,
          "pd": 6,
          "pf": 14,
          "playerNames": "Alice · Bob",
          "pts": 2,
          "wins": 2,
        },
        {
          "id": "tB",
          "losses": 1,
          "name": "Beta",
          "pa": 11,
          "pd": 1,
          "pf": 12,
          "playerNames": "Charlie · Diana",
          "pts": 1,
          "wins": 1,
        },
        {
          "id": "tC",
          "losses": 2,
          "name": "Gamma",
          "pa": 14,
          "pd": -7,
          "pf": 7,
          "playerNames": "Eve · Frank",
          "pts": 0,
          "wins": 0,
        },
      ]
    `)
  })

  it('handles empty matches gracefully', () => {
    expect(calcOverallStandings(teams, [], players)).toMatchInlineSnapshot(`
      [
        {
          "id": "tA",
          "losses": 0,
          "name": "Alpha",
          "pa": 0,
          "pd": 0,
          "pf": 0,
          "playerNames": "Alice · Bob",
          "pts": 0,
          "wins": 0,
        },
        {
          "id": "tB",
          "losses": 0,
          "name": "Beta",
          "pa": 0,
          "pd": 0,
          "pf": 0,
          "playerNames": "Charlie · Diana",
          "pts": 0,
          "wins": 0,
        },
        {
          "id": "tC",
          "losses": 0,
          "name": "Gamma",
          "pa": 0,
          "pd": 0,
          "pf": 0,
          "playerNames": "Eve · Frank",
          "pts": 0,
          "wins": 0,
        },
      ]
    `)
  })

  it('respects seed tiebreaker mode', () => {
    // tA and tB artificially tied — seed order should break the tie
    const tied = [
      { team1: 'tA', team2: 'tB', score1: 5, score2: 5, played: false },
    ]
    expect(
      calcOverallStandings(
        [teams[0], teams[1]],
        tied,
        players,
        { tieBreakerMode: 'seed', seedMap: { tA: 2, tB: 1 } }
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "tB",
          "losses": 0,
          "name": "Beta",
          "pa": 0,
          "pd": 0,
          "pf": 0,
          "playerNames": "Charlie · Diana",
          "pts": 0,
          "wins": 0,
        },
        {
          "id": "tA",
          "losses": 0,
          "name": "Alpha",
          "pa": 0,
          "pd": 0,
          "pf": 0,
          "playerNames": "Alice · Bob",
          "pts": 0,
          "wins": 0,
        },
      ]
    `)
  })
})

describe('calcPlayerStandings', () => {
  it('distributes team W/L to individual players', () => {
    expect(calcPlayerStandings(teams, matches, players)).toMatchInlineSnapshot(`
      [
        {
          "id": "p1",
          "losses": 0,
          "name": "Alice",
          "pts": 2,
          "wins": 2,
        },
        {
          "id": "p2",
          "losses": 0,
          "name": "Bob",
          "pts": 2,
          "wins": 2,
        },
        {
          "id": "p3",
          "losses": 1,
          "name": "Charlie",
          "pts": 1,
          "wins": 1,
        },
        {
          "id": "p4",
          "losses": 1,
          "name": "Diana",
          "pts": 1,
          "wins": 1,
        },
        {
          "id": "p5",
          "losses": 2,
          "name": "Eve",
          "pts": 0,
          "wins": 0,
        },
        {
          "id": "p6",
          "losses": 2,
          "name": "Frank",
          "pts": 0,
          "wins": 0,
        },
      ]
    `)
  })

  it('handles teams using playerIds instead of players', () => {
    const fpTeams = [
      { id: 'tA', name: 'Alpha', playerIds: ['p1', 'p2'] },
      { id: 'tB', name: 'Beta',  playerIds: ['p3', 'p4'] },
    ]
    expect(calcPlayerStandings(fpTeams, matches.slice(0, 1), players)).toMatchInlineSnapshot(`
      [
        {
          "id": "p1",
          "losses": 0,
          "name": "Alice",
          "pts": 1,
          "wins": 1,
        },
        {
          "id": "p2",
          "losses": 0,
          "name": "Bob",
          "pts": 1,
          "wins": 1,
        },
        {
          "id": "p3",
          "losses": 1,
          "name": "Charlie",
          "pts": 0,
          "wins": 0,
        },
        {
          "id": "p4",
          "losses": 1,
          "name": "Diana",
          "pts": 0,
          "wins": 0,
        },
      ]
    `)
  })
})
