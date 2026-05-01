-- ============================================================
-- Authenticated read access for public leagues
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
--
-- Goal: authenticated users who are NOT members of a public league
-- can still SELECT its tournament + player data.
--
-- Background: schema.sql defines `*: members can view` policies that
-- gate every nested table on `public.my_league_is_member(league_id)`,
-- which returns false for non-members. guest_read_access.sql added
-- parallel `TO anon` policies so logged-out visitors can browse public
-- leagues, but there was no equivalent for the `authenticated` role.
-- That left a gap: a logged-in user who isn't a member of a league
-- couldn't see its tournaments — even when the league is public —
-- while a logged-out user could.
--
-- This migration mirrors guest_read_access.sql, scoped TO authenticated.
-- Sensitive tables (league_member_roles, league_member_permissions,
-- notifications) are intentionally left out — non-members should not
-- see who else is in a league. `leagues` and `profiles` are already
-- readable by all authenticated users via existing policies in
-- schema.sql, so no new policy is needed for them.
-- No write access is granted.
-- ============================================================

-- ── players: authenticated can view players of public leagues ─────────────
DROP POLICY IF EXISTS "players: auth can view public league" ON public.players;
CREATE POLICY "players: auth can view public league" ON public.players
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = players.league_id
        AND l.visibility = 'public'
    )
  );

-- ── tournaments: authenticated can view tournaments of public leagues ─────
DROP POLICY IF EXISTS "tournaments: auth can view public league" ON public.tournaments;
CREATE POLICY "tournaments: auth can view public league" ON public.tournaments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = tournaments.league_id
        AND l.visibility = 'public'
    )
  );

-- ── teams: authenticated can view teams in tournaments of public leagues ──
DROP POLICY IF EXISTS "teams: auth can view public league" ON public.teams;
CREATE POLICY "teams: auth can view public league" ON public.teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE t.id = teams.tournament_id
        AND l.visibility = 'public'
    )
  );

-- ── team_players: authenticated can view assignments in public leagues ────
DROP POLICY IF EXISTS "team_players: auth can view public league" ON public.team_players;
CREATE POLICY "team_players: auth can view public league" ON public.team_players
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams te
      JOIN public.tournaments t ON t.id = te.tournament_id
      JOIN public.leagues l ON l.id = t.league_id
      WHERE te.id = team_players.team_id
        AND l.visibility = 'public'
    )
  );

-- ── groups: authenticated can view groups in public leagues ───────────────
DROP POLICY IF EXISTS "groups: auth can view public league" ON public.groups;
CREATE POLICY "groups: auth can view public league" ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE t.id = groups.tournament_id
        AND l.visibility = 'public'
    )
  );

-- ── group_teams: authenticated can view group team assignments ────────────
DROP POLICY IF EXISTS "group_teams: auth can view public league" ON public.group_teams;
CREATE POLICY "group_teams: auth can view public league" ON public.group_teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.tournaments t ON t.id = g.tournament_id
      JOIN public.leagues l ON l.id = t.league_id
      WHERE g.id = group_teams.group_id
        AND l.visibility = 'public'
    )
  );

-- ── knockout_rounds: authenticated can view knockout data ─────────────────
DROP POLICY IF EXISTS "knockout_rounds: auth can view public league" ON public.knockout_rounds;
CREATE POLICY "knockout_rounds: auth can view public league" ON public.knockout_rounds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE t.id = knockout_rounds.tournament_id
        AND l.visibility = 'public'
    )
  );

-- ── matches: authenticated can view match results in public leagues ───────
DROP POLICY IF EXISTS "matches: auth can view public league" ON public.matches;
CREATE POLICY "matches: auth can view public league" ON public.matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE t.id = matches.tournament_id
        AND l.visibility = 'public'
    )
  );
