-- Allow a player who is a member of a team to rename it.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).

DROP POLICY IF EXISTS "teams: team member can rename" ON public.teams;
CREATE POLICY "teams: team member can rename" ON public.teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_players tp
      JOIN public.players p ON p.id = tp.player_id
      WHERE tp.team_id = teams.id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_players tp
      JOIN public.players p ON p.id = tp.player_id
      WHERE tp.team_id = teams.id
        AND p.user_id = auth.uid()
    )
  );
