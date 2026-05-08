// Golden L3 characterization tests. DO NOT EDIT in Phases 5-7;
// ONLY EXTEND. If a phase requires you to change these, the
// refactor is wrong.

import { describe, it, expect } from 'vitest'
import {
  computePlayerLeagueRecord,
  computeServingStats,
  computePressureStats,
  computeStrengths,
  computePlaystyle,
  computeByTournament,
  computeWinStreak,
  computeAllPlayerStats,
} from '../playerStats.js'
import fixture from './fixtures/l3-match.json'

const { match, teams } = fixture

// Annotated match for p1 (Team 1, playerTeamNum=1).
// Uses a stable date so snapshot values don't drift.
const annotated = [
  {
    match,
    pid: 'p1',
    playerTeamNum: 1,
    playerTeamId: 'team-1',
    opposingTeamId: 'team-2',
    tournamentId: 'tour-1',
    tournamentName: 'Spring Classic',
    leagueId: 'league-1',
    leagueName: 'Beach League',
    date: 1705312800000,
    finishRank: 1,
  },
]

// Minimal league shape for computePlayerLeagueRecord
const league = {
  players: [{ id: 'p1', userId: 'user-1', points: 2 }],
  tournaments: [
    {
      teams,
      groups: [
        {
          matches: [match],
        },
      ],
      knockout: { rounds: [] },
      matches: [],
    },
  ],
}

describe('computePlayerLeagueRecord', () => {
  it('computes wins, losses, and bonus score for p1', () => {
    expect(computePlayerLeagueRecord('p1', league)).toMatchInlineSnapshot(`
      {
        "losses": 0,
        "score": 3,
        "wins": 1,
      }
    `)
  })

  it('returns zeroes for an unknown player', () => {
    expect(computePlayerLeagueRecord('p99', league)).toMatchInlineSnapshot(`
      {
        "losses": 0,
        "score": 0,
        "wins": 0,
      }
    `)
  })

  it('returns zeroes when league is null', () => {
    expect(computePlayerLeagueRecord('p1', null)).toMatchInlineSnapshot(`
      {
        "losses": 0,
        "score": 0,
        "wins": 0,
      }
    `)
  })
})

describe('computeServingStats', () => {
  it('returns full serve breakdown for p1 across the L3 match', () => {
    expect(computeServingStats(annotated)).toMatchInlineSnapshot(`
      {
        "aceRate": 0.25,
        "aces": 1,
        "bestSet": {
          "aces": 1,
          "errors": 0,
          "matchId": "match-1",
          "serveWinPct": 0.75,
          "serves": 4,
          "setNum": 1,
          "wins": 3,
        },
        "errorRate": 0,
        "longestServingRun": 1,
        "serveErrors": 0,
        "serveInPlayPct": 1,
        "serveWinPct": 0.75,
        "serveWins": 3,
        "setBySet": [
          {
            "aces": 1,
            "errors": 0,
            "matchId": "match-1",
            "serveWinPct": 0.75,
            "serves": 4,
            "setNum": 1,
            "wins": 3,
          },
        ],
        "totalServes": 4,
      }
    `)
  })
})

describe('computePressureStats', () => {
  it('returns clutch / side-out / comeback stats for p1', () => {
    expect(computePressureStats(annotated)).toMatchInlineSnapshot(`
      {
        "clutchLost": 3,
        "clutchPlayed": 7,
        "clutchWinPct": 0.5714285714285714,
        "clutchWon": 4,
        "comebackPoints": 0,
        "decidingSetLosses": 0,
        "decidingSetWinPct": 0,
        "decidingSetWins": 0,
        "receives": 5,
        "receivesWon": 3,
        "sideOutPct": 0.6,
      }
    `)
  })
})

describe('computeStrengths', () => {
  it('returns byType breakdown, top-shot and error profile for p1', () => {
    expect(computeStrengths(annotated, null)).toMatchInlineSnapshot(`
      {
        "byType": {
          "ace": 2,
          "block": 0,
          "spike": 0,
          "tip": 1,
        },
        "errorsByType": {
          "other": 2,
          "serve": 0,
          "spike": 0,
          "tip": 0,
          "untyped": 0,
        },
        "topErrorType": "other",
        "topShot": "ace",
        "topShotShare": 0.6666666666666666,
        "totalErrors": 2,
        "totalScoring": 3,
        "vsLeague": null,
        "weakestShot": "tip",
      }
    `)
  })

  it('computes vsLeague delta when averages are provided', () => {
    const avg = { ace: 0.1, spike: 0.4, block: 0.3, tip: 0.2 }
    expect(computeStrengths(annotated, avg)).toMatchInlineSnapshot(`
      {
        "byType": {
          "ace": 2,
          "block": 0,
          "spike": 0,
          "tip": 1,
        },
        "errorsByType": {
          "other": 2,
          "serve": 0,
          "spike": 0,
          "tip": 0,
          "untyped": 0,
        },
        "topErrorType": "other",
        "topShot": "ace",
        "topShotShare": 0.6666666666666666,
        "totalErrors": 2,
        "totalScoring": 3,
        "vsLeague": {
          "ace": 0.5666666666666667,
          "block": -0.3,
          "spike": -0.4,
          "tip": 0.1333333333333333,
        },
        "weakestShot": "tip",
      }
    `)
  })
})

describe('computePlaystyle', () => {
  it('classifies p1 playstyle from strengths', () => {
    const strengths = computeStrengths(annotated, null)
    expect(computePlaystyle(annotated, strengths)).toMatchInlineSnapshot(`
      {
        "consistency": 1,
        "consistencyByMatch": [
          {
            "matchId": "match-1",
            "points": 3,
            "share": 0.42857142857142855,
          },
        ],
        "label": "Server",
        "riskProfile": 0.4,
        "share": {
          "ace": 0.6666666666666666,
          "block": 0,
          "spike": 0,
          "tip": 0.3333333333333333,
        },
      }
    `)
  })
})

describe('computeByTournament', () => {
  it('groups matches by tournament and aggregates stats', () => {
    expect(computeByTournament(annotated)).toMatchInlineSnapshot(`
      [
        {
          "aces": 2,
          "date": 1705312800000,
          "finishRank": 1,
          "leagueId": "league-1",
          "leagueName": "Beach League",
          "losses": 0,
          "matches": [
            {
              "date": 1705312800000,
              "finishRank": 1,
              "leagueId": "league-1",
              "leagueName": "Beach League",
              "match": {
                "created_at": "2024-01-15T10:00:00.000Z",
                "id": "match-1",
                "log": [
                  {
                    "errorPlayerId": null,
                    "errorType": null,
                    "id": "e01",
                    "msg": null,
                    "nextServerPlayerId": "p2",
                    "nextServerTeam": 1,
                    "pointNum": 1,
                    "pointType": "ace",
                    "pointTypeIcon": "zap",
                    "pointTypeLabel": "Ace",
                    "scoringPlayerId": "p1",
                    "serverPlayerId": "p1",
                    "serverTeam": 1,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 1,
                    "t1": 1,
                    "t2": 0,
                    "team": 1,
                    "timestamp": 1705312801000,
                  },
                  {
                    "errorPlayerId": null,
                    "errorType": null,
                    "id": "e02",
                    "msg": null,
                    "nextServerPlayerId": "p1",
                    "nextServerTeam": 1,
                    "pointNum": 2,
                    "pointType": "spike",
                    "pointTypeIcon": "trending-up",
                    "pointTypeLabel": "Spike",
                    "scoringPlayerId": "p2",
                    "serverPlayerId": "p2",
                    "serverTeam": 1,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 2,
                    "t1": 2,
                    "t2": 0,
                    "team": 1,
                    "timestamp": 1705312810000,
                  },
                  {
                    "errorPlayerId": "p1",
                    "errorType": "net",
                    "id": "e03",
                    "msg": null,
                    "nextServerPlayerId": "p3",
                    "nextServerTeam": 2,
                    "pointNum": 3,
                    "pointType": "error",
                    "pointTypeIcon": "x",
                    "pointTypeLabel": "Error",
                    "scoringPlayerId": null,
                    "serverPlayerId": "p1",
                    "serverTeam": 1,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 1,
                    "t1": 2,
                    "t2": 1,
                    "team": 2,
                    "timestamp": 1705312820000,
                  },
                  {
                    "errorPlayerId": null,
                    "errorType": null,
                    "id": "e04",
                    "msg": null,
                    "nextServerPlayerId": "p4",
                    "nextServerTeam": 2,
                    "pointNum": 4,
                    "pointType": "spike",
                    "pointTypeIcon": "trending-up",
                    "pointTypeLabel": "Spike",
                    "scoringPlayerId": "p3",
                    "serverPlayerId": "p3",
                    "serverTeam": 2,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 2,
                    "t1": 2,
                    "t2": 2,
                    "team": 2,
                    "timestamp": 1705312831000,
                  },
                  {
                    "errorPlayerId": "p3",
                    "errorType": "serve",
                    "id": "e05",
                    "msg": null,
                    "nextServerPlayerId": "p1",
                    "nextServerTeam": 1,
                    "pointNum": 5,
                    "pointType": "error",
                    "pointTypeIcon": "x",
                    "pointTypeLabel": "Error",
                    "scoringPlayerId": null,
                    "serverPlayerId": "p4",
                    "serverTeam": 2,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 1,
                    "t1": 3,
                    "t2": 2,
                    "team": 1,
                    "timestamp": 1705312842000,
                  },
                  {
                    "errorPlayerId": null,
                    "errorType": null,
                    "id": "e06",
                    "msg": null,
                    "nextServerPlayerId": "p2",
                    "nextServerTeam": 1,
                    "pointNum": 6,
                    "pointType": "block",
                    "pointTypeIcon": "shield",
                    "pointTypeLabel": "Block",
                    "scoringPlayerId": "p2",
                    "serverPlayerId": "p1",
                    "serverTeam": 1,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 2,
                    "t1": 4,
                    "t2": 2,
                    "team": 1,
                    "timestamp": 1705312853000,
                  },
                  {
                    "errorPlayerId": "p1",
                    "errorType": "out",
                    "id": "e07",
                    "msg": null,
                    "nextServerPlayerId": "p3",
                    "nextServerTeam": 2,
                    "pointNum": 7,
                    "pointType": "error",
                    "pointTypeIcon": "x",
                    "pointTypeLabel": "Error",
                    "scoringPlayerId": null,
                    "serverPlayerId": "p2",
                    "serverTeam": 1,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 1,
                    "t1": 4,
                    "t2": 3,
                    "team": 2,
                    "timestamp": 1705312864000,
                  },
                  {
                    "errorPlayerId": null,
                    "errorType": null,
                    "id": "e08",
                    "msg": null,
                    "nextServerPlayerId": "p4",
                    "nextServerTeam": 2,
                    "pointNum": 8,
                    "pointType": "spike",
                    "pointTypeIcon": "trending-up",
                    "pointTypeLabel": "Spike",
                    "scoringPlayerId": "p4",
                    "serverPlayerId": "p3",
                    "serverTeam": 2,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 2,
                    "t1": 4,
                    "t2": 4,
                    "team": 2,
                    "timestamp": 1705312875000,
                  },
                  {
                    "errorPlayerId": "p4",
                    "errorType": "tip",
                    "id": "e09",
                    "msg": null,
                    "nextServerPlayerId": "p1",
                    "nextServerTeam": 1,
                    "pointNum": 9,
                    "pointType": "error",
                    "pointTypeIcon": "x",
                    "pointTypeLabel": "Error",
                    "scoringPlayerId": null,
                    "serverPlayerId": "p4",
                    "serverTeam": 2,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 1,
                    "t1": 5,
                    "t2": 4,
                    "team": 1,
                    "timestamp": 1705312886000,
                  },
                  {
                    "errorPlayerId": null,
                    "errorType": null,
                    "id": "e10",
                    "msg": null,
                    "nextServerPlayerId": "p2",
                    "nextServerTeam": 1,
                    "pointNum": 10,
                    "pointType": "tip",
                    "pointTypeIcon": "hand",
                    "pointTypeLabel": "Tip",
                    "scoringPlayerId": "p1",
                    "serverPlayerId": "p1",
                    "serverTeam": 1,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 2,
                    "t1": 6,
                    "t2": 4,
                    "team": 1,
                    "timestamp": 1705312897000,
                  },
                  {
                    "errorPlayerId": "p2",
                    "errorType": "other",
                    "id": "e11",
                    "msg": null,
                    "nextServerPlayerId": "p3",
                    "nextServerTeam": 2,
                    "pointNum": 11,
                    "pointType": "error",
                    "pointTypeIcon": "x",
                    "pointTypeLabel": "Error",
                    "scoringPlayerId": null,
                    "serverPlayerId": "p2",
                    "serverTeam": 1,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 1,
                    "t1": 6,
                    "t2": 5,
                    "team": 2,
                    "timestamp": 1705312908000,
                  },
                  {
                    "errorPlayerId": null,
                    "errorType": null,
                    "id": "e12",
                    "msg": null,
                    "nextServerPlayerId": "p1",
                    "nextServerTeam": 1,
                    "pointNum": 12,
                    "pointType": "ace",
                    "pointTypeIcon": "zap",
                    "pointTypeLabel": "Ace",
                    "scoringPlayerId": "p1",
                    "serverPlayerId": "p3",
                    "serverTeam": 2,
                    "setNum": 1,
                    "sideBeforePoint": null,
                    "sideChange": false,
                    "streak": 1,
                    "t1": 7,
                    "t2": 5,
                    "team": 1,
                    "timestamp": 1705312919000,
                  },
                ],
                "played": true,
                "score1": 7,
                "score2": 5,
                "sets": [
                  {
                    "s1": 7,
                    "s2": 5,
                  },
                ],
                "team1": "team-1",
                "team2": "team-2",
                "winner": "team-1",
              },
              "opposingTeamId": "team-2",
              "pid": "p1",
              "playerTeamId": "team-1",
              "playerTeamNum": 1,
              "tournamentId": "tour-1",
              "tournamentName": "Spring Classic",
            },
          ],
          "points": 3,
          "serveWinPct": 0.75,
          "serveWins": 3,
          "serves": 4,
          "spikes": 0,
          "tournamentId": "tour-1",
          "tournamentName": "Spring Classic",
          "wins": 1,
        },
      ]
    `)
  })
})

describe('computeWinStreak', () => {
  it('returns bestStreak and currentStreak for p1', () => {
    expect(computeWinStreak(annotated)).toMatchInlineSnapshot(`
      {
        "bestStreak": 1,
        "currentStreak": 1,
      }
    `)
  })

  it('handles empty annotated array', () => {
    expect(computeWinStreak([])).toMatchInlineSnapshot(`
      {
        "bestStreak": 0,
        "currentStreak": 0,
      }
    `)
  })
})

describe('computeAllPlayerStats', () => {
  it('returns the full stats bundle for p1 (complete L3 golden snapshot)', () => {
    const result = computeAllPlayerStats(annotated)
    // Assert top-level shape keys are stable
    expect(Object.keys(result).sort()).toMatchInlineSnapshot(`
      [
        "bestWinStreak",
        "byTournament",
        "byType",
        "currentWinStreak",
        "losses",
        "playstyle",
        "pressure",
        "serving",
        "strengths",
        "totalMatches",
        "winRate",
        "wins",
      ]
    `)
    // Assert computed scalar values
    expect({
      totalMatches: result.totalMatches,
      wins:         result.wins,
      losses:       result.losses,
      winRate:      result.winRate,
      bestWinStreak:    result.bestWinStreak,
      currentWinStreak: result.currentWinStreak,
    }).toMatchInlineSnapshot(`
      {
        "bestWinStreak": 1,
        "currentWinStreak": 1,
        "losses": 0,
        "totalMatches": 1,
        "winRate": 1,
        "wins": 1,
      }
    `)
    // Assert rich sub-objects
    expect(result.serving).toMatchInlineSnapshot(`
      {
        "aceRate": 0.25,
        "aces": 1,
        "bestSet": {
          "aces": 1,
          "errors": 0,
          "matchId": "match-1",
          "serveWinPct": 0.75,
          "serves": 4,
          "setNum": 1,
          "wins": 3,
        },
        "errorRate": 0,
        "longestServingRun": 1,
        "serveErrors": 0,
        "serveInPlayPct": 1,
        "serveWinPct": 0.75,
        "serveWins": 3,
        "setBySet": [
          {
            "aces": 1,
            "errors": 0,
            "matchId": "match-1",
            "serveWinPct": 0.75,
            "serves": 4,
            "setNum": 1,
            "wins": 3,
          },
        ],
        "totalServes": 4,
      }
    `)
    expect(result.pressure).toMatchInlineSnapshot(`
      {
        "clutchLost": 3,
        "clutchPlayed": 7,
        "clutchWinPct": 0.5714285714285714,
        "clutchWon": 4,
        "comebackPoints": 0,
        "decidingSetLosses": 0,
        "decidingSetWinPct": 0,
        "decidingSetWins": 0,
        "receives": 5,
        "receivesWon": 3,
        "sideOutPct": 0.6,
      }
    `)
    expect(result.strengths).toMatchInlineSnapshot(`
      {
        "byType": {
          "ace": 2,
          "block": 0,
          "spike": 0,
          "tip": 1,
        },
        "errorsByType": {
          "other": 2,
          "serve": 0,
          "spike": 0,
          "tip": 0,
          "untyped": 0,
        },
        "topErrorType": "other",
        "topShot": "ace",
        "topShotShare": 0.6666666666666666,
        "totalErrors": 2,
        "totalScoring": 3,
        "vsLeague": null,
        "weakestShot": "tip",
      }
    `)
    expect(result.byType).toMatchInlineSnapshot(`
      {
        "ace": 2,
        "block": 0,
        "spike": 0,
        "tip": 1,
      }
    `)
  })
})
