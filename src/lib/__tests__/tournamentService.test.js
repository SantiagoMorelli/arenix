import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTournamentElo } from '../../services/tournamentService';
import { supabase } from '../supabase';
import * as eloMath from '../elo';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('../elo', () => ({
  simulateTournamentElo: vi.fn()
}));

describe('processTournamentElo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error if tournament is already processed', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: { elo_processed: true, elo_log: expect.any(String) }, error: null });
    
    supabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });

    await expect(processTournamentElo('t1')).rejects.toThrow('Tournament Elo already processed');
  });

  it('fetches chronologically, simulates, and batch updates', async () => {
    // 1. Mock tournament fetch
    const tournamentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { elo_processed: false }, error: null }),
      update: vi.fn().mockReturnThis()
    };
    // Fix update().eq() chain to resolve
    tournamentChain.update.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    // 2. Mock teams/players fetch
    const teamsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 't1' }, { id: 't2' }], error: null })
    };
    
    const teamPlayersChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [
        { team_id: 't1', player_id: 'p1' },
        { team_id: 't2', player_id: 'p2' }
      ], error: null })
    };

    const playersChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [
        { id: 'p1', elo: 1000 },
        { id: 'p2', elo: 1000 }
      ], error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    };

    // 3. Mock matches fetch
    // Must fetch groups first, then knockouts ordered by round
    const matchesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [
        { id: 'm1', source_type: 'group' },
        { id: 'm2', source_type: 'knockout', knockout_rounds: { sort_order: 1 } }
      ], error: null })
    };

    supabase.from.mockImplementation((table) => {
      if (table === 'tournaments') return tournamentChain;
      if (table === 'teams') return teamsChain;
      if (table === 'team_players') return teamPlayersChain;
      if (table === 'players') return playersChain;
      if (table === 'matches') return matchesChain;
    });

    eloMath.simulateTournamentElo.mockReturnValue({ finalRatings: {
      'p1': 1010,
      'p2': 990 }, auditLog: 'mock log'
    });

    await processTournamentElo('t1');

    // Expectations
    expect(eloMath.simulateTournamentElo).toHaveBeenCalled();
    
    // Updates
    expect(supabase.from).toHaveBeenCalledWith('players');
    expect(supabase.from).toHaveBeenCalledWith('tournaments');
    expect(tournamentChain.update).toHaveBeenCalledWith({ elo_processed: true, elo_log: expect.any(String) });
    expect(playersChain.update).toHaveBeenCalledWith({ elo: 1010 });
    expect(playersChain.update).toHaveBeenCalledWith({ elo: 990 });
  });
});
