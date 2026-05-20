-- Fix: allow a linked player to rename their team without infinite recursion.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
--
-- The previous version queried team_players directly inside the policy, which
-- triggered team_players' own RLS policy that queries back into teams →
-- infinite recursion. The fix wraps the check in a SECURITY DEFINER function
-- so it bypasses RLS on team_players/players entirely.

-- 1. Helper function (bypasses RLS to avoid circular reference)
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_players tp
    JOIN public.players pl ON pl.id = tp.player_id
    WHERE tp.team_id = p_team_id
      AND pl.user_id = auth.uid()
  )
$$;

-- 2. Drop old (broken) policy if it exists
DROP POLICY IF EXISTS "teams: team member can rename" ON public.teams;

-- 3. New policy — uses the SECURITY DEFINER function
CREATE POLICY "teams: team member can rename" ON public.teams
  FOR UPDATE
  USING     (public.is_team_member(teams.id))
  WITH CHECK (public.is_team_member(teams.id));
