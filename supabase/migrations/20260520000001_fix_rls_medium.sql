-- =============================================================================
-- Fix: Medium RLS vulnerabilities
-- =============================================================================
-- Medium #1: players — "user can self-unlink" allows updating ALL columns
--            (wins, losses, points, elo) not just user_id → NULL
-- Medium #2: free_plays — created_by IS NULL legacy bypass allows any
--            authenticated user to mutate sessions they don't own
-- =============================================================================

-- ── Medium #1: players ────────────────────────────────────────────────────────
-- Before: FOR UPDATE USING (user_id = auth.uid())
--   → user can UPDATE any column on their player row (name, wins, losses, elo…)
-- After: add WITH CHECK (user_id IS NULL)
--   → the only valid post-update state is user_id = NULL (the intended unlink)
--   → any other update (changing stats, name, etc.) is rejected
DROP POLICY IF EXISTS "players: user can self-unlink" ON public.players;
CREATE POLICY "players: user can self-unlink" ON public.players
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id IS NULL);

-- ── Medium #2: free_plays (backfill + tighten policies) ───────────────────────
-- Step 1: Backfill created_by for legacy rows that have a league_id.
--   Strategy: assign the earliest admin of the associated league.
--   Rows without a league_id cannot be attributed and remain NULL.
UPDATE public.free_plays fp
SET created_by = (
  SELECT lmr.user_id
  FROM public.league_member_roles lmr
  WHERE lmr.league_id = fp.league_id
    AND lmr.role = 'admin'
  ORDER BY lmr.granted_at ASC NULLS LAST
  LIMIT 1
)
WHERE fp.created_by IS NULL
  AND fp.league_id IS NOT NULL;

-- Step 2: After the backfill, rows that still have created_by IS NULL
-- are standalone sessions (league_id IS NULL) with no traceable owner.
-- These are safe to delete if they are older than 30 days; they have
-- no associated league and no known creator.
-- REVIEW THIS BEFORE RUNNING: uncomment once you confirm there is no
-- active data you want to keep.
--
-- DELETE FROM public.free_plays
-- WHERE created_by IS NULL
--   AND league_id IS NULL
--   AND created_at < NOW() - INTERVAL '30 days';

-- Step 3: Tighten policies — remove the OR created_by IS NULL bypass.
-- After the backfill above, only truly unclaimed rows remain NULL,
-- and those can no longer be mutated by arbitrary users.

DROP POLICY IF EXISTS "free_plays: creator or legacy can update" ON public.free_plays;
CREATE POLICY "free_plays: creator can update" ON public.free_plays
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "free_plays: creator or legacy can delete" ON public.free_plays;
CREATE POLICY "free_plays: creator can delete" ON public.free_plays
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- Child tables: free_play_players
DROP POLICY IF EXISTS "free_play_players: creator or legacy can insert" ON public.free_play_players;
CREATE POLICY "free_play_players: creator can insert" ON public.free_play_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_players.free_play_id
        AND fp.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "free_play_players: creator or legacy can delete" ON public.free_play_players;
CREATE POLICY "free_play_players: creator can delete" ON public.free_play_players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_players.free_play_id
        AND fp.created_by = auth.uid()
    )
  );

-- Child tables: free_play_teams
DROP POLICY IF EXISTS "free_play_teams: creator or legacy can insert" ON public.free_play_teams;
CREATE POLICY "free_play_teams: creator can insert" ON public.free_play_teams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_teams.free_play_id
        AND fp.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "free_play_teams: creator or legacy can update" ON public.free_play_teams;
CREATE POLICY "free_play_teams: creator can update" ON public.free_play_teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_teams.free_play_id
        AND fp.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "free_play_teams: creator or legacy can delete" ON public.free_play_teams;
CREATE POLICY "free_play_teams: creator can delete" ON public.free_play_teams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_teams.free_play_id
        AND fp.created_by = auth.uid()
    )
  );

-- Child tables: free_play_games
DROP POLICY IF EXISTS "free_play_games: creator or legacy can insert" ON public.free_play_games;
CREATE POLICY "free_play_games: creator can insert" ON public.free_play_games
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_games.free_play_id
        AND fp.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "free_play_games: creator or legacy can update" ON public.free_play_games;
CREATE POLICY "free_play_games: creator can update" ON public.free_play_games
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_games.free_play_id
        AND fp.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "free_play_games: creator or legacy can delete" ON public.free_play_games;
CREATE POLICY "free_play_games: creator can delete" ON public.free_play_games
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_games.free_play_id
        AND fp.created_by = auth.uid()
    )
  );
