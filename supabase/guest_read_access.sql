-- ============================================================
-- Guest (anon) read access for public leagues and free plays
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
--
-- Goal: unauthenticated visitors (anon role) can SELECT data
-- belonging to leagues with visibility = 'public'.
-- They can also view shared free play sessions (already used by FreePlayJoin).
-- No write access is ever granted to anon.
--
-- Sensitive tables (league_member_roles, league_member_permissions,
-- notifications) are intentionally left out — anon can never read them.
-- ============================================================

-- ── leagues: anon can view public leagues ──────────────────────────────────
-- The existing policy "leagues: any auth user can view by invite code" uses
-- USING (TRUE) which already covers authenticated users for the join flow.
-- We keep that and add a narrower anon-only policy for public leagues.
DROP POLICY IF EXISTS "leagues: anon can view public" ON public.leagues;
CREATE POLICY "leagues: anon can view public" ON public.leagues
  FOR SELECT
  TO anon
  USING (visibility = 'public');

-- ── players: anon can view players of public leagues ──────────────────────
DROP POLICY IF EXISTS "players: anon can view public league" ON public.players;
CREATE POLICY "players: anon can view public league" ON public.players
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = players.league_id
        AND l.visibility = 'public'
    )
  );

-- ── tournaments: anon can view tournaments of public leagues ───────────────
DROP POLICY IF EXISTS "tournaments: anon can view public league" ON public.tournaments;
CREATE POLICY "tournaments: anon can view public league" ON public.tournaments
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = tournaments.league_id
        AND l.visibility = 'public'
    )
  );

-- ── teams: anon can view teams in tournaments of public leagues ────────────
DROP POLICY IF EXISTS "teams: anon can view public league" ON public.teams;
CREATE POLICY "teams: anon can view public league" ON public.teams
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE t.id = teams.tournament_id
        AND l.visibility = 'public'
    )
  );

-- ── team_players: anon can view assignments in public leagues ──────────────
DROP POLICY IF EXISTS "team_players: anon can view public league" ON public.team_players;
CREATE POLICY "team_players: anon can view public league" ON public.team_players
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.teams te
      JOIN public.tournaments t ON t.id = te.tournament_id
      JOIN public.leagues l ON l.id = t.league_id
      WHERE te.id = team_players.team_id
        AND l.visibility = 'public'
    )
  );

-- ── groups: anon can view groups in public leagues ─────────────────────────
DROP POLICY IF EXISTS "groups: anon can view public league" ON public.groups;
CREATE POLICY "groups: anon can view public league" ON public.groups
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE t.id = groups.tournament_id
        AND l.visibility = 'public'
    )
  );

-- ── group_teams: anon can view group team assignments in public leagues ─────
DROP POLICY IF EXISTS "group_teams: anon can view public league" ON public.group_teams;
CREATE POLICY "group_teams: anon can view public league" ON public.group_teams
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.tournaments t ON t.id = g.tournament_id
      JOIN public.leagues l ON l.id = t.league_id
      WHERE g.id = group_teams.group_id
        AND l.visibility = 'public'
    )
  );

-- ── knockout_rounds: anon can view knockout data in public leagues ──────────
DROP POLICY IF EXISTS "knockout_rounds: anon can view public league" ON public.knockout_rounds;
CREATE POLICY "knockout_rounds: anon can view public league" ON public.knockout_rounds
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE t.id = knockout_rounds.tournament_id
        AND l.visibility = 'public'
    )
  );

-- ── matches: anon can view match results in public leagues ─────────────────
DROP POLICY IF EXISTS "matches: anon can view public league" ON public.matches;
CREATE POLICY "matches: anon can view public league" ON public.matches
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE t.id = matches.tournament_id
        AND l.visibility = 'public'
    )
  );

-- ── profiles: anon can view minimal public profile data ───────────────────
-- Players linked to public leagues have their names displayed.
-- We expose only id + full_name + avatar_url + nickname (for display).
-- Sensitive fields (is_super_admin, can_create_league, notification_prefs,
-- email) are never selected by guest code paths, and RLS does not restrict
-- individual columns — so we rely on the app to only SELECT non-sensitive
-- columns. The policy grants row access; column restriction is in the queries.
--
-- Note: the existing "profiles: any member can view" policy (USING TRUE) already
-- allows all authenticated users to view all profiles. We add anon access
-- scoped to profiles linked to players in public leagues.
DROP POLICY IF EXISTS "profiles: anon can view public league members" ON public.profiles;
CREATE POLICY "profiles: anon can view public league members" ON public.profiles
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      JOIN public.leagues l ON l.id = p.league_id
      WHERE p.user_id = profiles.id
        AND l.visibility = 'public'
    )
  );

-- ── free_plays: anon can view shared free play sessions ───────────────────
-- FreePlayJoin already works for authenticated users; extend to anon.
-- free_plays has no visibility flag — all shared sessions are viewable.
DROP POLICY IF EXISTS "free_plays: anon can view" ON public.free_plays;
CREATE POLICY "free_plays: anon can view" ON public.free_plays
  FOR SELECT
  TO anon
  USING (TRUE);

-- ── free_play_teams: anon can view ────────────────────────────────────────
DROP POLICY IF EXISTS "free_play_teams: anon can view" ON public.free_play_teams;
CREATE POLICY "free_play_teams: anon can view" ON public.free_play_teams
  FOR SELECT
  TO anon
  USING (TRUE);

-- ── free_play_team_players: anon can view ─────────────────────────────────
DROP POLICY IF EXISTS "fpt_players: anon can view" ON public.free_play_team_players;
CREATE POLICY "fpt_players: anon can view" ON public.free_play_team_players
  FOR SELECT
  TO anon
  USING (TRUE);

-- ── free_play_games: anon can view ────────────────────────────────────────
DROP POLICY IF EXISTS "free_play_games: anon can view" ON public.free_play_games;
CREATE POLICY "free_play_games: anon can view" ON public.free_play_games
  FOR SELECT
  TO anon
  USING (TRUE);

-- ── free_play_players (if exists): anon can view ──────────────────────────
-- The freePlayService normalizer references a free_play_players table.
-- Add policy defensively; harmless if table doesn't exist in this db version.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'free_play_players'
  ) THEN
    EXECUTE $q$
      DROP POLICY IF EXISTS "free_play_players: anon can view" ON public.free_play_players;
      CREATE POLICY "free_play_players: anon can view" ON public.free_play_players
        FOR SELECT TO anon USING (TRUE);
    $q$;
  END IF;
END
$$;
