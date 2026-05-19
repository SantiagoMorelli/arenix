import { describe, it, expect } from 'vitest';
import { getKFactor, simulateTournamentElo, calculateExpectedScore, calculateNewElo } from '../elo';

describe('getKFactor', () => {
  it('returns 20 for group stage matches', () => {
    expect(getKFactor('group', null)).toBe(20);
  });

  it('returns 25 for early knockout matches', () => {
    expect(getKFactor('knockout', 'r16')).toBe(25);
    expect(getKFactor('knockout', 'qf')).toBe(25);
    expect(getKFactor('knockout', 'third_place')).toBe(25);
  });

  it('returns 30 for semi-final matches', () => {
    expect(getKFactor('knockout', 'semi')).toBe(30);
  });

  it('returns 40 for final matches', () => {
    expect(getKFactor('knockout', 'final')).toBe(40);
  });
});

describe('calculateExpectedScore', () => {
  it('calculates 50% probability for equal ratings', () => {
    expect(calculateExpectedScore(1000, 1000)).toBe(0.5);
  });
  
  it('calculates correct probability for different ratings', () => {
    // 1200 vs 1000 -> 1200 has 76% chance of winning
    const expected = calculateExpectedScore(1200, 1000);
    expect(expected).toBeGreaterThan(0.75);
    expect(expected).toBeLessThan(0.77);
  });
});

describe('calculateNewElo', () => {
  it('updates elo correctly for a win', () => {
    // Both 1000, K=20, Actual=1, Expected=0.5 -> New Elo = 1000 + 20 * (1 - 0.5) = 1010
    expect(calculateNewElo(1000, 1000, 1, 20)).toBe(1010);
  });

  it('updates elo correctly for a loss', () => {
    // Both 1000, K=20, Actual=0, Expected=0.5 -> New Elo = 1000 + 20 * (0 - 0.5) = 990
    expect(calculateNewElo(1000, 1000, 0, 20)).toBe(990);
  });
});

describe('simulateTournamentElo', () => {
  it('simulates a tournament sequentially and returns updated player elos', () => {
    const players = {
      'p1': { id: 'p1', elo: 1000 },
      'p2': { id: 'p2', elo: 1000 },
      'p3': { id: 'p3', elo: 1200 },
      'p4': { id: 'p4', elo: 1200 }
    };

    const teamPlayers = [
      { team_id: 't1', player_id: 'p1' },
      { team_id: 't1', player_id: 'p2' }, // Team 1 average: 1000
      { team_id: 't2', player_id: 'p3' },
      { team_id: 't2', player_id: 'p4' }  // Team 2 average: 1200
    ];

    const matches = [
      {
        id: 'm1',
        source_type: 'group',
        team1_id: 't1',
        team2_id: 't2',
        winner_id: 't1', // Upset! t1 wins
        played: true
      }
    ];

    const { finalRatings: result } = simulateTournamentElo(matches, teamPlayers, players);

    // After upset (K=20):
    // t1 expected = ~0.24, actual = 1 => 1000 + 20 * (1 - 0.24) = ~1015.2 -> 1015
    // t2 expected = ~0.76, actual = 0 => 1200 + 20 * (0 - 0.76) = ~1184.8 -> 1185
    expect(result['p1']).toBeGreaterThan(1000);
    expect(result['p2']).toBeGreaterThan(1000);
    expect(result['p3']).toBeLessThan(1200);
    expect(result['p4']).toBeLessThan(1200);
  });
});
