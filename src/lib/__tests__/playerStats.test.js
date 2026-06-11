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
    level: 3,
  },
]

const ORIGINAL_L3_BARE = {
  totalMatches: 1,
  wins: 1,
  losses: 0,
  winRate: 1,
  bestWinStreak: 1,
  currentWinStreak: 1,
  serving: {
    totalServes: 4,
    aces: 1,
    serveErrors: 0,
    serveWins: 3,
    serveInPlayPct: 1,
    serveWinPct: 0.75,
    aceRate: 0.25,
    errorRate: 0,
    longestServingRun: 1,
  },
  pressure: {
    clutchPlayed: 7,
    clutchWon: 4,
    clutchLost: 3,
    clutchWinPct: 0.5714285714285714,
    receives: 5,
    receivesWon: 3,
    sideOutPct: 0.6,
    comebackPoints: 0,
    decidingSetWins: 0,
    decidingSetLosses: 0,
    decidingSetWinPct: 0,
  },
  strengths: {
    byType: { ace: 2, spike: 0, block: 0, tip: 1 },
    topShot: 'ace',
    topShotShare: 0.6666666666666666,
  },
}

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
    const result = computeServingStats(annotated)
    expect({ sampleSize: result.sampleSize, totalMatches: result.totalMatches, minLevel: result.minLevel }).toMatchInlineSnapshot(`
      {
        "minLevel": 3,
        "sampleSize": 1,
        "totalMatches": 1,
      }
    `)
    expect(result.value).toMatchInlineSnapshot(`
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
    expect(computePressureStats(annotated).value).toMatchInlineSnapshot(`
      {
        "clutchErrors": 2,
        "clutchLost": 3,
        "clutchPlayed": 7,
        "clutchWinPct": 0.5714285714285714,
        "clutchWon": 4,
        "comebackPoints": 0,
        "decidingSetLosses": 0,
        "decidingSetWinPct": 0,
        "decidingSetWins": 0,
        "fatigueErrors": 0,
        "fatiguePlayed": 0,
        "receives": 5,
        "receivesWon": 3,
        "sideOutPct": 0.6,
      }
    `)
  })
})

describe('computeStrengths', () => {
  it('returns byType breakdown, top-shot and error profile for p1', () => {
    expect(computeStrengths(annotated, null).value).toMatchInlineSnapshot(`
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
    expect(computeStrengths(annotated, avg).value).toMatchInlineSnapshot(`
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
    const strengths = computeStrengths(annotated, null).value
    expect(computePlaystyle(annotated, strengths).value).toMatchInlineSnapshot(`
      {
        "consistency": 1,
        "consistencyByMatch": [
          {
            "matchId": "match-1",
            "points": 3,
            "share": 0.42857142857142855,
          },
        ],
        "dominance": {
          "ace": 4.761904761904761,
          "block": 0,
          "spike": 0,
          "tip": 1.5151515151515151,
        },
        "label": "All-rounder",
        "riskProfile": 0.4,
        "share": {
          "ace": 0.6666666666666666,
          "block": 0,
          "spike": 0,
          "tip": 0.3333333333333333,
        },
        "traits": [],
      }
    `)
  })
})

describe('computePlaystyle — dominance classifier & traits', () => {
  const mkStrengths = (byType, totalErrors = 0) => ({
    byType,
    totalScoring: Object.values(byType).reduce((s, v) => s + v, 0),
    totalErrors,
  })

  // n matches where p1 scores `mine` of `team` total team points each match.
  const mkAnnotated = (n, mine, team) => Array.from({ length: n }, (_, i) => ({
    pid: 'p1',
    playerTeamNum: 1,
    match: {
      id: `m-${i}`,
      log: [
        ...Array.from({ length: mine }, () => ({ team: 1, scoringPlayerId: 'p1' })),
        ...Array.from({ length: team - mine }, () => ({ team: 1, scoringPlayerId: 'p2' })),
      ],
    },
  }))

  it('labels a tip-dominant player Finesse', () => {
    const strengths = mkStrengths({ ace: 1, spike: 4, block: 1, tip: 6 })
    expect(computePlaystyle(mkAnnotated(3, 4, 10), strengths).value.label).toBe('Finesse')
  })

  it('labels a spike-dominant player Aggressor past the dominance margin', () => {
    const strengths = mkStrengths({ ace: 2, spike: 12, block: 3, tip: 3 })
    expect(computePlaystyle(mkAnnotated(3, 4, 10), strengths).value.label).toBe('Aggressor')
  })

  it('stays All-rounder when no shot is sufficiently over-represented', () => {
    // Shares sit close to the baselines — max dominance is spike at 1.125 < 1.3.
    const strengths = mkStrengths({ ace: 2, spike: 9, block: 5, tip: 4 })
    expect(computePlaystyle(mkAnnotated(3, 4, 10), strengths).value.label).toBe('All-rounder')
  })

  it('stays All-rounder below the scoring sample guard', () => {
    const strengths = mkStrengths({ ace: 0, spike: 0, block: 0, tip: 5 })
    expect(computePlaystyle(mkAnnotated(3, 4, 10), strengths).value.label).toBe('All-rounder')
  })

  it('awards clutch and comebackKid with sufficient pressure sample', () => {
    const strengths = mkStrengths({ ace: 3, spike: 3, block: 3, tip: 3 })
    const pressure = { clutchPlayed: 25, clutchWinPct: 0.7, comebackPoints: 10 }
    const { traits } = computePlaystyle(mkAnnotated(5, 3, 10), strengths, pressure).value
    expect(traits).toContain('clutch')
    expect(traits).toContain('comebackKid')
  })

  it('withholds clutch traits below the sample guards', () => {
    const strengths = mkStrengths({ ace: 3, spike: 3, block: 3, tip: 3 })
    const pressure = { clutchPlayed: 10, clutchWinPct: 0.9, comebackPoints: 10 }
    const { traits } = computePlaystyle(mkAnnotated(4, 3, 10), strengths, pressure).value
    expect(traits).not.toContain('clutch')
    expect(traits).not.toContain('comebackKid')
  })

  it('awards safeHands at low risk with enough attempts', () => {
    const strengths = mkStrengths({ ace: 6, spike: 6, block: 6, tip: 6 }, 4) // 4/28 ≈ 14%
    const { traits } = computePlaystyle(mkAnnotated(3, 4, 10), strengths).value
    expect(traits).toContain('safeHands')
    expect(traits).not.toContain('gambler')
  })

  it('awards gambler at high risk with enough attempts', () => {
    const strengths = mkStrengths({ ace: 0, spike: 15, block: 0, tip: 0 }, 12) // 12/27 ≈ 44%
    const { traits } = computePlaystyle(mkAnnotated(3, 4, 10), strengths).value
    expect(traits).toContain('gambler')
  })

  it('withholds risk traits below the attempts guard', () => {
    const strengths = mkStrengths({ ace: 4, spike: 4, block: 4, tip: 4 }, 1) // 17 attempts
    const { traits } = computePlaystyle(mkAnnotated(3, 4, 10), strengths).value
    expect(traits).not.toContain('safeHands')
    expect(traits).not.toContain('gambler')
  })

  it('awards workhorse and metronome for a steady high scoring share', () => {
    const strengths = mkStrengths({ ace: 3, spike: 3, block: 3, tip: 3 })
    const { traits } = computePlaystyle(mkAnnotated(6, 6, 10), strengths).value
    expect(traits).toContain('workhorse')
    expect(traits).toContain('metronome')
  })

  it('withholds workhorse below the match sample guard', () => {
    const strengths = mkStrengths({ ace: 3, spike: 3, block: 3, tip: 3 })
    const { traits } = computePlaystyle(mkAnnotated(4, 6, 10), strengths).value
    expect(traits).not.toContain('workhorse')
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
              "level": 3,
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
    expect(computeWinStreak(annotated).value).toMatchInlineSnapshot(`
      {
        "bestStreak": 1,
        "currentStreak": 1,
      }
    `)
  })

  it('handles empty annotated array', () => {
    expect(computeWinStreak([]).value).toMatchInlineSnapshot(`
      {
        "bestStreak": 0,
        "currentStreak": 0,
      }
    `)
  })
})

describe('computeAllPlayerStats', () => {
  it('keeps L3 values identical and sampleSize == totalMatches', () => {
    const result = computeAllPlayerStats(annotated)
    expect(result.totalMatches).toBe(ORIGINAL_L3_BARE.totalMatches)
    expect(result.wins.value).toBe(ORIGINAL_L3_BARE.wins)
    expect(result.losses.value).toBe(ORIGINAL_L3_BARE.losses)
    expect(result.winRate.value).toBe(ORIGINAL_L3_BARE.winRate)
    expect(result.bestWinStreak.value).toBe(ORIGINAL_L3_BARE.bestWinStreak)
    expect(result.currentWinStreak.value).toBe(ORIGINAL_L3_BARE.currentWinStreak)
    expect(result.serving.value.totalServes).toBe(ORIGINAL_L3_BARE.serving.totalServes)
    expect(result.serving.value.aces).toBe(ORIGINAL_L3_BARE.serving.aces)
    expect(result.serving.value.serveWinPct).toBe(ORIGINAL_L3_BARE.serving.serveWinPct)
    expect(result.serving.value.aceRate).toBe(ORIGINAL_L3_BARE.serving.aceRate)
    expect(result.pressure.value).toMatchObject(ORIGINAL_L3_BARE.pressure)
    expect(result.strengths.value.topShot).toBe(ORIGINAL_L3_BARE.strengths.topShot)
    expect(result.strengths.value.topShotShare).toBe(ORIGINAL_L3_BARE.strengths.topShotShare)
    expect(result.byType.value).toMatchObject(ORIGINAL_L3_BARE.strengths.byType)

    for (const key of ['wins', 'losses', 'winRate', 'bestWinStreak', 'currentWinStreak', 'serving', 'pressure', 'strengths', 'playstyle', 'byType', 'perMatchAverages']) {
      expect(result[key].sampleSize).toBe(result[key].totalMatches)
    }
  })

  it('filters sample size by min level for mixed L3/L2 history', () => {
    const l2Match = { ...match, id: 'match-l2' }
    const mixed = [
      annotated[0],
      { ...annotated[0], match: l2Match, level: 2, date: 1705312900000 },
    ]
    const result = computeAllPlayerStats(mixed)
    expect(result.totalMatches).toBe(2)
    expect(result.serving.sampleSize).toBe(1)
    expect(result.pressure.sampleSize).toBe(1)
    expect(result.strengths.sampleSize).toBe(1)
    expect(result.playstyle.sampleSize).toBe(1)
    expect(result.perMatchAverages.sampleSize).toBe(2)
    expect(result.wins.sampleSize).toBe(2)
    expect(result.winRate.sampleSize).toBe(2)
  })
})
