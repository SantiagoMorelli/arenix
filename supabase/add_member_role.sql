-- Add 'member' as a valid role in league_member_roles.
-- 'member' = joined the league but not yet linked to a player profile.
-- Admin promotes them to 'player' by linking their account to a roster entry.

ALTER TABLE public.league_member_roles
  DROP CONSTRAINT IF EXISTS league_member_roles_role_check;

ALTER TABLE public.league_member_roles
  ADD CONSTRAINT league_member_roles_role_check
  CHECK (role IN ('admin', 'player', 'viewer', 'member'));
