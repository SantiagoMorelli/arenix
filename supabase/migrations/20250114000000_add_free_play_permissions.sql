-- ─────────────────────────────────────────────────────────────────────────────
-- Free Play Permissions & Access
--
-- Adds:
--   1. created_by column on free_plays (creator = admin)
--   2. Tightened RLS: only admin (or legacy NULL) can UPDATE / DELETE
--   3. INSERT now enforces created_by = auth.uid()
--   4. Public SELECT via invite_code stays open (previously relaxed in
--      add_free_play_feature.sql); we keep that for the invite-link view.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add created_by column (nullable — legacy rows stay NULL)
ALTER TABLE public.free_plays
  ADD COLUMN IF NOT EXISTS created_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS free_plays_created_by_idx ON public.free_plays (created_by);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Replace / tighten RLS policies on free_plays
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old, overly-permissive policies (names from schema.sql + add_free_play_feature.sql)
DROP POLICY IF EXISTS "free_plays: anyone can view"          ON public.free_plays;
DROP POLICY IF EXISTS "free_plays: auth user can insert"     ON public.free_plays;
DROP POLICY IF EXISTS "free_plays: auth user can update"     ON public.free_plays;
DROP POLICY IF EXISTS "free_plays: auth user can delete"     ON public.free_plays;

-- SELECT: public (no login required) — supports invite-link viewers and
-- league-member views. Row-level filtering is handled at the query layer
-- (getFreePlayByInviteCode uses invite_code; getFreePlay uses id + auth).
CREATE POLICY "free_plays: public can view"
  ON public.free_plays
  FOR SELECT
  USING (true);

-- INSERT: any authenticated user, but must set created_by to own uid.
CREATE POLICY "free_plays: auth user can insert"
  ON public.free_plays
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- UPDATE: only the creator OR legacy rows (created_by IS NULL, any authed user).
CREATE POLICY "free_plays: creator or legacy can update"
  ON public.free_plays
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR created_by IS NULL)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- DELETE: same rule as UPDATE.
CREATE POLICY "free_plays: creator or legacy can delete"
  ON public.free_plays
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Child tables — ensure writes are gated to creator/legacy as well
--    (reads stay open because SELECT on free_play_players/teams/games
--     was already public in add_free_play_feature.sql)
-- ─────────────────────────────────────────────────────────────────────────────

-- free_play_players: writes allowed only when parent session allows it
DROP POLICY IF EXISTS "free_play_players: auth user can insert" ON public.free_play_players;
DROP POLICY IF EXISTS "free_play_players: auth user can delete" ON public.free_play_players;

CREATE POLICY "free_play_players: creator or legacy can insert"
  ON public.free_play_players
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_id
        AND (fp.created_by = auth.uid() OR fp.created_by IS NULL)
    )
  );

CREATE POLICY "free_play_players: creator or legacy can delete"
  ON public.free_play_players
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_id
        AND (fp.created_by = auth.uid() OR fp.created_by IS NULL)
    )
  );

-- free_play_teams: writes gated to creator/legacy
DROP POLICY IF EXISTS "free_play_teams: auth user can insert" ON public.free_play_teams;
DROP POLICY IF EXISTS "free_play_teams: auth user can update" ON public.free_play_teams;
DROP POLICY IF EXISTS "free_play_teams: auth user can delete" ON public.free_play_teams;

CREATE POLICY "free_play_teams: creator or legacy can insert"
  ON public.free_play_teams
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_id
        AND (fp.created_by = auth.uid() OR fp.created_by IS NULL)
    )
  );

CREATE POLICY "free_play_teams: creator or legacy can update"
  ON public.free_play_teams
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_id
        AND (fp.created_by = auth.uid() OR fp.created_by IS NULL)
    )
  );

CREATE POLICY "free_play_teams: creator or legacy can delete"
  ON public.free_play_teams
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_id
        AND (fp.created_by = auth.uid() OR fp.created_by IS NULL)
    )
  );

-- free_play_games: writes gated to creator/legacy
DROP POLICY IF EXISTS "free_play_games: auth user can insert" ON public.free_play_games;
DROP POLICY IF EXISTS "free_play_games: auth user can update" ON public.free_play_games;
DROP POLICY IF EXISTS "free_play_games: auth user can delete" ON public.free_play_games;

CREATE POLICY "free_play_games: creator or legacy can insert"
  ON public.free_play_games
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_id
        AND (fp.created_by = auth.uid() OR fp.created_by IS NULL)
    )
  );

CREATE POLICY "free_play_games: creator or legacy can update"
  ON public.free_play_games
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_id
        AND (fp.created_by = auth.uid() OR fp.created_by IS NULL)
    )
  );

CREATE POLICY "free_play_games: creator or legacy can delete"
  ON public.free_play_games
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = free_play_id
        AND (fp.created_by = auth.uid() OR fp.created_by IS NULL)
    )
  );
