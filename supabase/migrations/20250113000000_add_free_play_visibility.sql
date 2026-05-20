-- ─────────────────────────────────────────────────────────────────────────────
-- Free Play Visibility Fix
--
-- Problem: The "free_plays: public can view" policy (USING true) lets every
-- authenticated user read every Free Play row in getFreePlays(), so all
-- sessions appear in every user's /free-play list.
--
-- Fix:
--   1. Drop the overly-permissive authenticated SELECT policy.
--   2. Create a SECURITY DEFINER helper that defines "can this user see this
--      Free Play?" → creator OR league-linked player in the session OR superadmin.
--   3. Add a tightened authenticated SELECT policy using that helper.
--   4. Add a separate lightweight policy so authed users can still fetch a
--      session via invite_code (used by FreePlayJoin for authed viewers).
--
-- Not changed:
--   - "free_plays: anon can view" (TO anon, USING true) in guest_read_access.sql
--     stays untouched — keeps FreePlayJoin working for unauthenticated visitors.
--   - All child-table SELECT policies stay open (needed by FreePlayJoin + session
--     pages; listing is controlled at the parent free_plays level).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop old permissive authenticated SELECT policy
DROP POLICY IF EXISTS "free_plays: public can view" ON public.free_plays;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS helper: is a given Free Play visible to the current authed user?
--    Returns true when:
--      a) Current user is the creator (created_by = auth.uid()), OR
--      b) Current user is a league-linked player added to the session
--         (free_play_players.league_player_id → players.user_id = auth.uid()), OR
--      c) Current user is a platform superadmin.
--
--    Legacy rows (created_by IS NULL) return FALSE for all non-superadmin users,
--    hiding them from the list while keeping them reachable via direct URL/code.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_free_play_is_visible(fp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    -- superadmin bypass
    public.is_super_admin()
    OR
    -- I created it
    EXISTS (
      SELECT 1 FROM public.free_plays fp
      WHERE fp.id = fp_id
        AND fp.created_by = auth.uid()
    )
    OR
    -- I am a league-linked player inside this session
    EXISTS (
      SELECT 1
      FROM public.free_play_players fpp
      JOIN public.players p ON p.id = fpp.league_player_id
      WHERE fpp.free_play_id = fp_id
        AND p.user_id = auth.uid()
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tightened SELECT policy for authenticated users (list + direct-id access)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "free_plays: creator or player can view" ON public.free_plays;
CREATE POLICY "free_plays: creator or player can view"
  ON public.free_plays
  FOR SELECT
  TO authenticated
  USING ( public.my_free_play_is_visible(id) );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Allow authenticated users to fetch a session by invite_code
--    (used by FreePlayJoin.jsx when the viewer happens to be logged in).
--    Knowing the code is the existing security model for the invite-link page;
--    this row will NOT appear in the /free-play list because getFreePlays()
--    only returns sessions matching the membership criteria above.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "free_plays: authed can view by invite_code" ON public.free_plays;
CREATE POLICY "free_plays: authed can view by invite_code"
  ON public.free_plays
  FOR SELECT
  TO authenticated
  USING ( invite_code IS NOT NULL );
