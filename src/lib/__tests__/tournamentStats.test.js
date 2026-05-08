// Golden L3 characterization tests. DO NOT EDIT in Phases 5-7;
// ONLY EXTEND. If a phase requires you to change these, the
// refactor is wrong.

import { describe, it, expect } from 'vitest'
import {
  computePlayerStats,
  rankPlayersByStat,
  TOURNAMENT_RANKING_MIN_LEVELS,
  computeTeamTournamentTotals,
  computePlayerTournamentBreakdown,
  computeMatchBreakdown,
} from '../tournamentStats.js'
import fixture from './fixtures/l3-match.json'

const { match, teams, players } = fixture
const allMatches = [match]

describe('computePlayerStats', () => {
  it('aggregates points/errors/serves per player across all matches', () => {
    expect(computePlayerStats(allMatches)).toMatchInlineSnapshot(`
      {
        "p1": {
          "aces": 2,
          "blocks": 0,
          "errors": 2,
          "points": 3,
          "serveWinPct": 75,
          "serveWins": 3,
          "serves": 4,
          "spikes": 0,
          "tips": 1,
        },
        "p2": {
          "aces": 0,
          "blocks": 1,
          "errors": 1,
          "points": 2,
          "serveWinPct": 33,
          "serveWins": 1,
          "serves": 3,
          "spikes": 1,
          "tips": 0,
        },
        "p3": {
          "aces": 0,
          "blocks": 0,
          "errors": 1,
          "points": 1,
          "serveWinPct": 67,
          "serveWins": 2,
          "serves": 3,
          "spikes": 1,
          "tips": 0,
        },
        "p4": {
          "aces": 0,
          "blocks": 0,
          "errors": 1,
          "points": 1,
          "serveWinPct": 0,
          "serveWins": 0,
          "serves": 2,
          "spikes": 1,
          "tips": 0,
        },
      }
    `)
  })

  it('returns empty object for unplayed matches', () => {
    expect(computePlayerStats([{ ...match, played: false }])).toMatchInlineSnapshot(`{}`)
  })

  it('returns empty object for matches with no log', () => {
    expect(computePlayerStats([{ ...match, log: [] }])).toMatchInlineSnapshot(`{}`)
  })
})

describe('rankPlayersByStat', () => {
  const ps = computePlayerStats(allMatches)

  it('ranks by points desc', () => {
    expect(rankPlayersByStat(ps, 'points', { leaguePlayers: players })).toMatchInlineSnapshot(`
      [
        {
          "name": "Alice",
          "pid": "p1",
          "secondary": null,
          "value": 3,
        },
        {
          "name": "Bob",
          "pid": "p2",
          "secondary": null,
          "value": 2,
        },
        {
          "name": "Charlie",
          "pid": "p3",
          "secondary": null,
          "value": 1,
        },
        {
          "name": "Diana",
          "pid": "p4",
          "secondary": null,
          "value": 1,
        },
      ]
    `)
  })

  it('ranks by aces desc', () => {
    expect(rankPlayersByStat(ps, 'aces', { leaguePlayers: players })).toMatchInlineSnapshot(`
      [
        {
          "name": "Alice",
          "pid": "p1",
          "secondary": null,
          "value": 2,
        },
      ]
    `)
  })

  it('applies minThreshold via gateKey for serve win%', () => {
    // Only players with ≥ 3 serves qualify
    expect(
      rankPlayersByStat(ps, 'serveWinPct', {
        leaguePlayers: players,
        minThreshold: 3,
        gateKey: 'serves',
        secondaryKey: 'serves',
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "name": "Alice",
          "pid": "p1",
          "secondary": 4,
          "value": 75,
        },
        {
          "name": "Charlie",
          "pid": "p3",
          "secondary": 3,
          "value": 67,
        },
        {
          "name": "Bob",
          "pid": "p2",
          "secondary": 3,
          "value": 33,
        },
      ]
    `)
  })

  it('returns empty array when no player meets threshold', () => {
    expect(
      rankPlayersByStat(ps, 'serveWinPct', { minThreshold: 999, gateKey: 'serves' })
    ).toMatchInlineSnapshot(`[]`)
  })
})

describe('computeTeamTournamentTotals', () => {
  it('totals pointsScored, mistakes, wins, losses and perPlayer for team-1', () => {
    expect(computeTeamTournamentTotals(teams[0], allMatches, players)).toMatchInlineSnapshot(`
      {
        "losses": 0,
        "mistakes": 3,
        "perPlayer": [
          {
            "errors": 2,
            "name": "Alice",
            "net": 1,
            "pid": "p1",
            "points": 3,
          },
          {
            "errors": 1,
            "name": "Bob",
            "net": 1,
            "pid": "p2",
            "points": 2,
          },
        ],
        "pointsScored": 7,
        "wins": 1,
      }
    `)
  })

  it('totals for team-2', () => {
    expect(computeTeamTournamentTotals(teams[1], allMatches, players)).toMatchInlineSnapshot(`
      {
        "losses": 1,
        "mistakes": 2,
        "perPlayer": [
          {
            "errors": 1,
            "name": "Charlie",
            "net": 0,
            "pid": "p3",
            "points": 1,
          },
          {
            "errors": 1,
            "name": "Diana",
            "net": 0,
            "pid": "p4",
            "points": 1,
          },
        ],
        "pointsScored": 5,
        "wins": 0,
      }
    `)
  })

  it('returns zero row when team is null', () => {
    expect(computeTeamTournamentTotals(null, allMatches, players)).toMatchInlineSnapshot(`
      {
        "losses": 0,
        "mistakes": 0,
        "perPlayer": [],
        "pointsScored": 0,
        "wins": 0,
      }
    `)
  })
})

describe('computePlayerTournamentBreakdown', () => {
  it('breaks down all stats for p1 across the match set', () => {
    expect(computePlayerTournamentBreakdown('p1', allMatches)).toMatchInlineSnapshot(`
      {
        "byType": {
          "ace": 2,
          "block": 0,
          "spike": 0,
          "tip": 1,
        },
        "errors": 2,
        "errorsByType": {
          "other": 2,
          "serve": 0,
          "spike": 0,
          "tip": 0,
          "untyped": 0,
        },
        "matchesPlayed": 1,
        "net": 1,
        "points": 3,
        "serveAces": 1,
        "serveWinPct": 75,
        "serveWins": 3,
        "serves": 4,
        "setsPlayed": 1,
      }
    `)
  })

  it('breaks down all stats for p3', () => {
    expect(computePlayerTournamentBreakdown('p3', allMatches)).toMatchInlineSnapshot(`
      {
        "byType": {
          "ace": 0,
          "block": 0,
          "spike": 1,
          "tip": 0,
        },
        "errors": 1,
        "errorsByType": {
          "other": 0,
          "serve": 1,
          "spike": 0,
          "tip": 0,
          "untyped": 0,
        },
        "matchesPlayed": 1,
        "net": 0,
        "points": 1,
        "serveAces": 1,
        "serveWinPct": 67,
        "serveWins": 2,
        "serves": 3,
        "setsPlayed": 1,
      }
    `)
  })

  it('returns zeroes for a player who did not appear', () => {
    expect(computePlayerTournamentBreakdown('p99', allMatches)).toMatchInlineSnapshot(`
      {
        "byType": {
          "ace": 0,
          "block": 0,
          "spike": 0,
          "tip": 0,
        },
        "errors": 0,
        "errorsByType": {
          "other": 0,
          "serve": 0,
          "spike": 0,
          "tip": 0,
          "untyped": 0,
        },
        "matchesPlayed": 0,
        "net": 0,
        "points": 0,
        "serveAces": 0,
        "serveWinPct": 0,
        "serveWins": 0,
        "serves": 0,
        "setsPlayed": 0,
      }
    `)
  })
})

describe('computeMatchBreakdown', () => {
  it('breaks down the match by team and per-player type', () => {
    expect(computeMatchBreakdown(match, players, teams)).toMatchInlineSnapshot(`
      {
        "team1": {
          "byType": {
            "ace": 2,
            "block": 1,
            "error": 2,
            "spike": 1,
            "tip": 1,
          },
          "perPlayer": [
            {
              "byType": {
                "ace": 2,
                "block": 0,
                "spike": 0,
                "tip": 1,
              },
              "errors": 2,
              "name": "Alice",
              "pid": "p1",
              "points": 3,
            },
            {
              "byType": {
                "ace": 0,
                "block": 1,
                "spike": 1,
                "tip": 0,
              },
              "errors": 1,
              "name": "Bob",
              "pid": "p2",
              "points": 2,
            },
          ],
          "teamId": "team-1",
          "teamName": "Eagles",
          "total": 7,
        },
        "team2": {
          "byType": {
            "ace": 0,
            "block": 0,
            "error": 3,
            "spike": 2,
            "tip": 0,
          },
          "perPlayer": [
            {
              "byType": {
                "ace": 0,
                "block": 0,
                "spike": 1,
                "tip": 0,
              },
              "errors": 1,
              "name": "Charlie",
              "pid": "p3",
              "points": 1,
            },
            {
              "byType": {
                "ace": 0,
                "block": 0,
                "spike": 1,
                "tip": 0,
              },
              "errors": 1,
              "name": "Diana",
              "pid": "p4",
              "points": 1,
            },
          ],
          "teamId": "team-2",
          "teamName": "Hawks",
          "total": 5,
        },
      }
    `)
  })

  it('handles a match with an empty log', () => {
    expect(computeMatchBreakdown({ ...match, log: [] }, players, teams)).toMatchInlineSnapshot(`
      {
        "team1": {
          "byType": {
            "ace": 0,
            "block": 0,
            "error": 0,
            "spike": 0,
            "tip": 0,
          },
          "perPlayer": [
            {
              "byType": {
                "ace": 0,
                "block": 0,
                "spike": 0,
                "tip": 0,
              },
              "errors": 0,
              "name": "Alice",
              "pid": "p1",
              "points": 0,
            },
            {
              "byType": {
                "ace": 0,
                "block": 0,
                "spike": 0,
                "tip": 0,
              },
              "errors": 0,
              "name": "Bob",
              "pid": "p2",
              "points": 0,
            },
          ],
          "teamId": "team-1",
          "teamName": "Eagles",
          "total": 0,
        },
        "team2": {
          "byType": {
            "ace": 0,
            "block": 0,
            "error": 0,
            "spike": 0,
            "tip": 0,
          },
          "perPlayer": [
            {
              "byType": {
                "ace": 0,
                "block": 0,
                "spike": 0,
                "tip": 0,
              },
              "errors": 0,
              "name": "Charlie",
              "pid": "p3",
              "points": 0,
            },
            {
              "byType": {
                "ace": 0,
                "block": 0,
                "spike": 0,
                "tip": 0,
              },
              "errors": 0,
              "name": "Diana",
              "pid": "p4",
              "points": 0,
            },
          ],
          "teamId": "team-2",
          "teamName": "Hawks",
          "total": 0,
        },
      }
    `)
  })
})

describe('Phase 6 level-aware tournament stats', () => {
  const l1Match = {
    id: 'm-l1',
    played: true,
    team1: 'team-1',
    team2: 'team-2',
    score1: 3,
    score2: 2,
    winner: 'team-1',
    log: [
      { id: 'l1-1', team: 1, setNum: 1 },
      { id: 'l1-2', team: 2, setNum: 1 },
      { id: 'l1-3', team: 1, setNum: 1 },
      { id: 'l1-4', team: 2, setNum: 1 },
      { id: 'l1-5', team: 1, setNum: 1 },
    ],
  }

  const l2Match = {
    id: 'm-l2',
    played: true,
    team1: 'team-1',
    team2: 'team-2',
    score1: 4,
    score2: 3,
    winner: 'team-1',
    log: [
      { id: 'l2-1', team: 1, scoringPlayerId: 'p1', setNum: 1 },
      { id: 'l2-2', team: 2, scoringPlayerId: 'p3', setNum: 1 },
      { id: 'l2-3', team: 1, scoringPlayerId: 'p2', setNum: 1 },
      { id: 'l2-4', team: 2, scoringPlayerId: 'p4', setNum: 1 },
      { id: 'l2-5', team: 1, scoringPlayerId: 'p1', setNum: 1 },
      { id: 'l2-6', team: 2, errorPlayerId: 'p1', setNum: 1 },
      { id: 'l2-7', team: 1, errorPlayerId: 'p3', setNum: 1 },
    ],
  }

  it('returns zero partial shape for L1 player breakdown', () => {
    expect(computePlayerTournamentBreakdown('p1', [l1Match], 1)).toMatchInlineSnapshot(`
      {
        "errors": 0,
        "points": 0,
      }
    `)
  })

  it('returns partial points/errors shape for L2 player breakdown', () => {
    expect(computePlayerTournamentBreakdown('p1', [l2Match], 2)).toMatchInlineSnapshot(`
      {
        "errors": 1,
        "points": 2,
      }
    `)
  })

  it('exposes tournament ranking min levels used by UI gating', () => {
    expect(TOURNAMENT_RANKING_MIN_LEVELS).toMatchInlineSnapshot(`
      {
        "aces": 3,
        "blocks": 3,
        "errors": 2,
        "points": 2,
        "serveWinPct": 3,
        "spikes": 3,
        "tips": 3,
      }
    `)
  })
})
