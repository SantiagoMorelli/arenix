-- Free Play Feature Migration
-- Run this in the Supabase SQL Editor.

-- ── 1. Extend free_plays ──────────────────────────────────────────────────────
ALTER TABLE public.free_plays
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'finished')),
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE
    DEFAULT UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 10));

CREATE INDEX IF NOT EXISTS idx_free_plays_invite_code ON public.free_plays(invite_code);

-- ── 2. Session-scoped player roster (league players + guests) ─────────────────
CREATE TABLE IF NOT EXISTS public.free_play_players (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  free_play_id     UUID NOT NULL REFERENCES public.free_plays(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  league_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  is_guest         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fpp_free_play_id ON public.free_play_players(free_play_id);

-- ── 3. Store team rosters as JSONB (array of free_play_players.id) ────────────
ALTER TABLE public.free_play_teams
  ADD COLUMN IF NOT EXISTS player_ids JSONB NOT NULL DEFAULT '[]'::JSONB;

-- ── 4. Sets-per-match on game records ─────────────────────────────────────────
ALTER TABLE public.free_play_games
  ADD COLUMN IF NOT EXISTS sets_per_match INTEGER NOT NULL DEFAULT 1;

-- ── 5. RLS for free_play_players ──────────────────────────────────────────────
ALTER TABLE public.free_play_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fpp: select all"    ON public.free_play_players;
DROP POLICY IF EXISTS "fpp: insert all"    ON public.free_play_players;
DROP POLICY IF EXISTS "fpp: delete authed" ON public.free_play_players;

-- Anyone (including unauthenticated guests on the join page) can read + insert
CREATE POLICY "fpp: select all"    ON public.free_play_players FOR SELECT USING (TRUE);
CREATE POLICY "fpp: insert all"    ON public.free_play_players FOR INSERT WITH CHECK (TRUE);
-- Only authenticated users (organisers) can remove players
CREATE POLICY "fpp: delete authed" ON public.free_play_players FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── 6. Allow update + delete on free_play_teams ───────────────────────────────
DROP POLICY IF EXISTS "fpt: update authed" ON public.free_play_teams;
DROP POLICY IF EXISTS "fpt: delete authed" ON public.free_play_teams;
CREATE POLICY "fpt: update authed" ON public.free_play_teams FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "fpt: delete authed" ON public.free_play_teams FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── 7. Allow unauthenticated SELECT on free_plays (for the guest join page) ───
-- Drop and recreate the existing select policy to allow public read by id.
-- Adjust the policy name below if yours differs.
DROP POLICY IF EXISTS "free_plays: members can view" ON public.free_plays;
CREATE POLICY "free_plays: anyone can view" ON public.free_plays
  FOR SELECT USING (TRUE);
