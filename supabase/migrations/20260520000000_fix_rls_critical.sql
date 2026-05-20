-- =============================================================================
-- Fix: Critical RLS privilege escalation vulnerabilities
-- =============================================================================
-- Critical #1: league_member_roles — any user could self-grant 'admin' in any league
-- Critical #2: league_member_permissions — any user could self-grant any permission
--              in any league without being a member
-- High:        notifications — any authenticated user could send notifications
--              to any other user's inbox
-- =============================================================================

-- ── Critical #1: league_member_roles ─────────────────────────────────────────
-- Before: WITH CHECK (user_id = auth.uid())
-- Any user could INSERT role='admin' for any league_id.
-- Fix: restrict self-insert to role='member' only (the join flow already uses
-- this exact role). Admin promotion is handled by the "admin can manage" policy.
DROP POLICY IF EXISTS "member_roles: user can self-insert" ON public.league_member_roles;
CREATE POLICY "member_roles: user can self-insert" ON public.league_member_roles
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
  );

-- ── Critical #2: league_member_permissions ────────────────────────────────────
-- Before: WITH CHECK (user_id = auth.uid())
-- Any user could INSERT manage_league/score_match/etc. for any league_id.
-- Fix: require the user to already be a member of the target league.
-- Note: my_league_is_member checks league_member_roles, which already has
-- the 'member' row from the join flow — no circular dependency.
DROP POLICY IF EXISTS "member_perms: user can self-insert" ON public.league_member_permissions;
CREATE POLICY "member_perms: user can self-insert" ON public.league_member_permissions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND public.my_league_is_member(league_id)
  );

-- ── High: notifications ───────────────────────────────────────────────────────
-- Before: WITH CHECK (auth.uid() IS NOT NULL)
-- Any authenticated user could insert notifications into any user's inbox.
-- Fix: require the caller to be an admin of a league that the target user belongs to.
DROP POLICY IF EXISTS "notifs: insert for others" ON public.notifications;
CREATE POLICY "notifs: insert for others" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() != notifications.user_id
    AND EXISTS (
      SELECT 1
      FROM public.league_member_roles caller
      JOIN public.league_member_roles target
        ON target.league_id = caller.league_id
       AND target.user_id   = notifications.user_id
      WHERE caller.user_id = auth.uid()
        AND caller.role    = 'admin'
    )
  );
