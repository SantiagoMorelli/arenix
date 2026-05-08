// Golden L3 characterization tests. DO NOT EDIT in Phases 5-7;
// ONLY EXTEND. If a phase requires you to change these, the
// refactor is wrong.

import { describe, it, expect } from 'vitest'
import {
  calcLeadStats,
  calcDynamics,
  calcLeadMoments,
  calcLeadChangeList,
  cumulativeMargin,
  calcMVP,
  calcPlayerContribution,
  lastKContribution,
  calcClutchPoints,
  calcPeakWindow,
  calcCumulativeSeries,
  calcHeadToHead,
  calcServeStats,
  calcServeTimeline,
  calcBestStreakRun,
  calcTiedMoments,
  calcClutchMoments,
  calcMvpMoments,
  calcRunnerUp,
  calcServeStreaks,
  MIN_LEVEL,
} from '../matchStats.js'
import fixture    from './fixtures/l3-match.json'
import fixtureL1  from './fixtures/l1-match.json'
import fixtureL2  from './fixtures/l2-match.json'

const log = fixture.match.log

// Pre-computed team stat blobs derived from the L3 log.
// Team 1 (p1, p2): p1 scored e01/e10/e12 (ace×2, tip×1); p2 scored e02/e06 (spike×1, block×1).
// Errors: p1 on e03/e07; p2 on e11.
const s1 = {
  total: 7,
  playerPts:    { p1: 3, p2: 2 },
  playerErrors: { p1: 2, p2: 1 },
  playerByType: {
    p1: { ace: 2, spike: 0, block: 0, tip: 1 },
    p2: { ace: 0, spike: 1, block: 1, tip: 0 },
  },
}
// Team 2 (p3, p4): p3 scored e04 (spike×1); p4 scored e08 (spike×1).
// Errors: p3 on e05; p4 on e09.
const s2 = {
  total: 5,
  playerPts:    { p3: 1, p4: 1 },
  playerErrors: { p3: 1, p4: 1 },
  playerByType: {
    p3: { ace: 0, spike: 1, block: 0, tip: 0 },
    p4: { ace: 0, spike: 1, block: 0, tip: 0 },
  },
}

const allPlayerIds  = ['p1', 'p2', 'p3', 'p4']
const t1PlayerIds   = ['p1', 'p2']

describe('calcLeadStats', () => {
  it('returns maxLead, maxLeadTeam, and lead-change count', () => {
    expect(calcLeadStats(log)).toMatchInlineSnapshot(`
      {
        "changes": 0,
        "maxLead": 2,
        "maxLeadTeam": 1,
      }
    `)
  })

  it('handles empty log', () => {
    expect(calcLeadStats([])).toMatchInlineSnapshot(`
      {
        "changes": 0,
        "maxLead": 0,
        "maxLeadTeam": null,
      }
    `)
  })
})

describe('calcDynamics', () => {
  it('counts tied moments and close points', () => {
    expect(calcDynamics(log)).toMatchInlineSnapshot(`
      {
        "closePoints": 12,
        "timesTied": 2,
      }
    `)
  })
})

describe('calcLeadMoments', () => {
  it('returns all points where the max lead was reached', () => {
    const moments = calcLeadMoments(log)
    expect(moments.length).toMatchInlineSnapshot(`4`)
    expect(moments.map(m => m.pointNum)).toMatchInlineSnapshot(`
      [
        2,
        6,
        10,
        12,
      ]
    `)
  })
})

describe('calcLeadChangeList', () => {
  it('returns an entry for each lead change', () => {
    expect(calcLeadChangeList(log)).toMatchInlineSnapshot(`[]`)
  })
})

describe('cumulativeMargin', () => {
  it('produces the (t1 - t2) series', () => {
    expect(cumulativeMargin(log)).toMatchInlineSnapshot(`
      [
        1,
        2,
        1,
        0,
        1,
        2,
        1,
        0,
        1,
        2,
        1,
        2,
      ]
    `)
  })
})

describe('calcMVP', () => {
  it('returns highest-net player', () => {
    expect(calcMVP(allPlayerIds, s1, s2, t1PlayerIds)).toMatchInlineSnapshot(`
      {
        "net": 1,
        "pid": "p1",
      }
    `)
  })

  it('returns null for empty player list', () => {
    expect(calcMVP([], s1, s2, t1PlayerIds)).toMatchInlineSnapshot(`null`)
  })
})

describe('calcPlayerContribution', () => {
  it('breaks down p1 contribution vs team-1 stats', () => {
    expect(calcPlayerContribution('p1', log, s1)).toMatchInlineSnapshot(`
      {
        "acePts": 2,
        "biggestStreak": 1,
        "blockPts": 0,
        "contributionPct": 43,
        "errors": 2,
        "net": 1,
        "pts": 3,
        "spikePts": 0,
        "tipPts": 1,
      }
    `)
  })

  it('breaks down p3 contribution vs team-2 stats', () => {
    expect(calcPlayerContribution('p3', log, s2)).toMatchInlineSnapshot(`
      {
        "acePts": 0,
        "biggestStreak": 1,
        "blockPts": 0,
        "contributionPct": 20,
        "errors": 1,
        "net": 0,
        "pts": 1,
        "spikePts": 1,
        "tipPts": 0,
      }
    `)
  })
})

describe('lastKContribution', () => {
  it('counts p1 scores in last 5 points', () => {
    expect(lastKContribution('p1', log, 5)).toMatchInlineSnapshot(`
      {
        "of": 5,
        "scored": 2,
      }
    `)
  })
})

describe('calcClutchPoints', () => {
  it('counts p1 scores within ±2 margin', () => {
    expect(calcClutchPoints('p1', log)).toMatchInlineSnapshot(`3`)
  })
})

describe('calcPeakWindow', () => {
  it('finds the best 5-point window for p1', () => {
    expect(calcPeakWindow('p1', log, 5)).toMatchInlineSnapshot(`
      {
        "count": 2,
        "end": 12,
        "start": 8,
      }
    `)
  })

  it('returns zeroes for a player with no scores', () => {
    expect(calcPeakWindow('p99', log, 5)).toMatchInlineSnapshot(`
      {
        "count": 0,
        "end": 0,
        "start": 0,
      }
    `)
  })
})

describe('calcCumulativeSeries', () => {
  it('builds running point total for p1', () => {
    expect(calcCumulativeSeries('p1', log)).toMatchInlineSnapshot(`
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        3,
      ]
    `)
  })
})

describe('calcHeadToHead', () => {
  it('compares p1 vs p3 over the full log', () => {
    expect(calcHeadToHead('p1', 'p3', log)).toMatchInlineSnapshot(`
      {
        "errA": 2,
        "errB": 1,
        "ptsA": 3,
        "ptsB": 1,
      }
    `)
  })
})

describe('calcServeStats', () => {
  it('computes serve win% and ace count for p1', () => {
    expect(calcServeStats(log, 'p1')).toMatchInlineSnapshot(`
      {
        "aces": 1,
        "count": 4,
        "pct": 75,
      }
    `)
  })

  it('returns zeroes for a player who never served', () => {
    expect(calcServeStats(log, 'p99')).toMatchInlineSnapshot(`
      {
        "aces": 0,
        "count": 0,
        "pct": 0,
      }
    `)
  })
})

describe('calcServeTimeline', () => {
  it('lists all p1 serve entries with outcome metadata', () => {
    const timeline = calcServeTimeline('p1', log)
    expect(timeline.length).toMatchInlineSnapshot(`4`)
    expect(timeline.map(e => ({ pointNum: e.pointNum, won: e.won, pointType: e.pointType }))).toMatchInlineSnapshot(`
      [
        {
          "pointNum": 1,
          "pointType": "ace",
          "won": true,
        },
        {
          "pointNum": 3,
          "pointType": "error",
          "won": false,
        },
        {
          "pointNum": 6,
          "pointType": "block",
          "won": true,
        },
        {
          "pointNum": 10,
          "pointType": "tip",
          "won": true,
        },
      ]
    `)
  })
})

describe('calcBestStreakRun', () => {
  it('finds the longest consecutive team streak', () => {
    const run = calcBestStreakRun(log)
    expect({ team: run.team, length: run.length }).toMatchInlineSnapshot(`
      {
        "length": 2,
        "team": 1,
      }
    `)
    expect(run.points.map(p => p.pointNum)).toMatchInlineSnapshot(`
      [
        1,
        2,
      ]
    `)
  })

  it('handles empty log', () => {
    expect(calcBestStreakRun([])).toMatchInlineSnapshot(`
      {
        "length": 0,
        "points": [],
        "team": null,
      }
    `)
  })
})

describe('calcTiedMoments', () => {
  it('returns all points where t1 === t2', () => {
    expect(calcTiedMoments(log).map(e => ({ pointNum: e.pointNum, t1: e.t1, t2: e.t2 }))).toMatchInlineSnapshot(`
      [
        {
          "pointNum": 4,
          "t1": 2,
          "t2": 2,
        },
        {
          "pointNum": 8,
          "t1": 4,
          "t2": 4,
        },
      ]
    `)
  })
})

describe('calcClutchMoments', () => {
  it('returns all points played within a 2-point margin', () => {
    expect(calcClutchMoments(log).map(e => e.pointNum)).toMatchInlineSnapshot(`
      [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
      ]
    `)
  })
})

describe('calcMvpMoments', () => {
  it('returns scored and error moments for p1', () => {
    expect(
      calcMvpMoments('p1', log).map(e => ({ pointNum: e.pointNum, kind: e.kind }))
    ).toMatchInlineSnapshot(`
      [
        {
          "kind": "scored",
          "pointNum": 1,
        },
        {
          "kind": "error",
          "pointNum": 3,
        },
        {
          "kind": "error",
          "pointNum": 7,
        },
        {
          "kind": "scored",
          "pointNum": 10,
        },
        {
          "kind": "scored",
          "pointNum": 12,
        },
      ]
    `)
  })
})

describe('calcRunnerUp', () => {
  it('returns second-highest net player after MVP is excluded', () => {
    expect(calcRunnerUp(allPlayerIds, s1, s2, t1PlayerIds, 'p1')).toMatchInlineSnapshot(`
      {
        "net": 1,
        "pid": "p2",
      }
    `)
  })
})

describe('calcServeStreaks', () => {
  it('reports longest and trailing serve-win run', () => {
    const timeline = calcServeTimeline('p1', log)
    expect(calcServeStreaks(timeline)).toMatchInlineSnapshot(`
      {
        "longest": 2,
        "trailing": 2,
        "trailingWon": true,
      }
    `)
  })

  it('handles empty timeline', () => {
    expect(calcServeStreaks([])).toMatchInlineSnapshot(`
      {
        "longest": 0,
        "trailing": 0,
        "trailingWon": null,
      }
    `)
  })
})

// ── L1 fixture tests (extend-only; L3 golden snapshots above stay untouched) ─

const logL1 = fixtureL1.match.log

describe('L1 (Basic) — lead and dynamics from a points-only log', () => {
  it('calcLeadStats works with no pointType or scoringPlayerId fields', () => {
    expect(calcLeadStats(logL1)).toMatchInlineSnapshot(`
      {
        "changes": 0,
        "maxLead": 2,
        "maxLeadTeam": 1,
      }
    `)
  })

  it('calcDynamics works with no pointType or scoringPlayerId fields', () => {
    expect(calcDynamics(logL1)).toMatchInlineSnapshot(`
      {
        "closePoints": 6,
        "timesTied": 1,
      }
    `)
  })
})

// ── L2 fixture tests ─────────────────────────────────────────────────────────

const logL2         = fixtureL2.match.log
const allPidsL2     = ['p1', 'p2', 'p3', 'p4']
const t1PidsL2      = ['p1', 'p2']

// Team stats derived from l2 log: scoringPlayerId counts only, no pointType.
const s1L2 = {
  total: 4,
  playerPts:    { p1: 2, p2: 2 },
  playerErrors: {},
}
const s2L2 = {
  total: 2,
  playerPts:    { p3: 1, p4: 1 },
  playerErrors: {},
}

describe('L2 (Intermediate) — per-player MVP from scoringPlayerId log', () => {
  it('calcMVP returns highest-net player using L2 stats', () => {
    expect(calcMVP(allPidsL2, s1L2, s2L2, t1PidsL2)).toMatchInlineSnapshot(`
      {
        "net": 2,
        "pid": "p1",
      }
    `)
  })

  it('calcLeadStats also works on an L2 log', () => {
    expect(calcLeadStats(logL2)).toMatchInlineSnapshot(`
      {
        "changes": 0,
        "maxLead": 2,
        "maxLeadTeam": 1,
      }
    `)
  })
})

// ── MIN_LEVEL metadata assertions ─────────────────────────────────────────────

describe('MIN_LEVEL annotations', () => {
  it('lead and dynamics functions are L1', () => {
    expect(MIN_LEVEL.calcLeadStats).toBe(1)
    expect(MIN_LEVEL.calcDynamics).toBe(1)
  })

  it('MVP and player contribution functions are L2', () => {
    expect(MIN_LEVEL.calcMVP).toBe(2)
    expect(MIN_LEVEL.calcPlayerContribution).toBe(2)
    expect(MIN_LEVEL.calcPeakWindow).toBe(2)
    expect(MIN_LEVEL.calcClutchPoints).toBe(2)
  })

  it('serve stats are L3', () => {
    expect(MIN_LEVEL.calcServeStats).toBe(3)
  })

  it('L1 functions compute correctly from a points-only log (no scoringPlayerId)', () => {
    expect(calcLeadStats(logL1).maxLead).toBeGreaterThan(0)
    expect(calcDynamics(logL1).timesTied).toBeGreaterThanOrEqual(0)
  })

  it('L2 functions compute correctly when scoringPlayerId is present but pointType is absent', () => {
    expect(calcMVP(allPidsL2, s1L2, s2L2, t1PidsL2)?.pid).toBe('p1')
    expect(calcClutchPoints('p1', logL2)).toBeGreaterThanOrEqual(0)
    expect(calcPeakWindow('p1', logL2, 3).count).toBeGreaterThanOrEqual(0)
  })
})
