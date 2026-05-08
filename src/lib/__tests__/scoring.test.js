// Golden L3 characterization tests. DO NOT EDIT in Phases 5-7;
// ONLY EXTEND. If a phase requires you to change these, the
// refactor is wrong.

import { describe, it, expect } from 'vitest'
import { resolveScoringLevel } from '../scoring.js'

describe('resolveScoringLevel', () => {
  it('returns the tournament level when set and in range', () => {
    expect(resolveScoringLevel({ scoringConfig: { level: 1 } }, null)).toBe(1)
    expect(resolveScoringLevel({ scoringConfig: { level: 2 } }, null)).toBe(2)
    expect(resolveScoringLevel({ scoringConfig: { level: 3 } }, null)).toBe(3)
  })

  it('falls back to league level when tournament has no config', () => {
    expect(resolveScoringLevel(null, { scoringConfig: { level: 1 } })).toBe(1)
    expect(resolveScoringLevel(null, { scoringConfig: { level: 2 } })).toBe(2)
    expect(resolveScoringLevel({}, { scoringConfig: { level: 2 } })).toBe(2)
    expect(resolveScoringLevel({ scoringConfig: null }, { scoringConfig: { level: 2 } })).toBe(2)
  })

  it('returns 3 when both tournament and league are absent or null', () => {
    expect(resolveScoringLevel(null, null)).toBe(3)
    expect(resolveScoringLevel({}, {})).toBe(3)
    expect(resolveScoringLevel(null, {})).toBe(3)
    expect(resolveScoringLevel(undefined, undefined)).toBe(3)
  })

  it('falls back to 3 for invalid levels (0, 4, non-integer)', () => {
    expect(resolveScoringLevel({ scoringConfig: { level: 0 } }, null)).toBe(3)
    expect(resolveScoringLevel({ scoringConfig: { level: 4 } }, null)).toBe(3)
    expect(resolveScoringLevel({ scoringConfig: { level: 'foo' } }, null)).toBe(3)
    expect(resolveScoringLevel(null, { scoringConfig: { level: 0 } })).toBe(3)
    expect(resolveScoringLevel(null, { scoringConfig: { level: 4 } })).toBe(3)
  })

  it('tournament level takes precedence over league level', () => {
    expect(resolveScoringLevel(
      { scoringConfig: { level: 1 } },
      { scoringConfig: { level: 3 } }
    )).toBe(1)
    expect(resolveScoringLevel(
      { scoringConfig: { level: 2 } },
      { scoringConfig: { level: 3 } }
    )).toBe(2)
    expect(resolveScoringLevel(
      { scoringConfig: { level: 3 } },
      { scoringConfig: { level: 1 } }
    )).toBe(3)
  })
})
