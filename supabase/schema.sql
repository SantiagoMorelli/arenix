-- ============================================================
-- Arenix — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- profiles  (mirrors auth.users, created by trigger on signup)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL DEFAULT '',
  avatar_url     TEXT,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- leagues
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leagues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  season      TEXT NOT NULL DEFAULT '2026',
  invite_code TEXT UNIQUE NOT NULL
    DEFAULT UPPER(SUBSTRING(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8)),
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leagues_invite_code ON public.leagues(invite_code);

-- ──────────────────────────────────────────────────────────────
-- league_members  (membership log; role column kept for compat)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.league_members (
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'player'
    CHECK (role IN ('admin', 'player', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id)
);

-- ──────────────────────────────────────────────────────────────
-- league_member_roles  (multi-role junction; source of truth)
-- Roles: admin | player | viewer  (scorer is a permission, not a role)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.league_member_roles (
  league_id  UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'player', 'viewer')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id, role)
);

-- ──────────────────────────────────────────────────────────────
-- league_member_permissions  (ad-hoc permission grants)
-- score_match is NOT granted to players by default — must be explicit
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.league_member_permissions (
  league_id  UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN (
    'manage_league','create_tournament','invite_players','score_match','edit_profile'
  )),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id, permission)
);

-- ──────────────────────────────────────────────────────────────
-- Data migration from league_members → new tables
-- Run ONCE in SQL Editor after deploying this schema.
-- Safe to skip if league_members is empty.
-- Note: old 'scorer' rows map to 'viewer' role + score_match permission.
-- ──────────────────────────────────────────────────────────────
-- -- Roles (scorer → viewer, owner → admin)
-- INSERT INTO public.league_member_roles (league_id, user_id, role, granted_at)
-- SELECT
--   league_id, user_id,
--   CASE role WHEN 'scorer' THEN 'viewer' WHEN 'owner' THEN 'admin' ELSE role END,
--   joined_at
-- FROM public.league_members
-- ON CONFLICT DO NOTHING;
--
-- -- Admin permissions (all 5)
-- INSERT INTO public.league_member_permissions (league_id, user_id, permission, granted_at)
-- SELECT league_id, user_id, p.permission, joined_at
-- FROM public.league_members
-- CROSS JOIN (VALUES ('manage_league'),('create_tournament'),('invite_players'),('score_match'),('edit_profile')) AS p(permission)
-- WHERE role = 'admin' ON CONFLICT DO NOTHING;
--
-- -- Player permissions (edit_profile only — score_match must be granted explicitly)
-- INSERT INTO public.league_member_permissions (league_id, user_id, permission, granted_at)
-- SELECT league_id, user_id, 'edit_profile', joined_at
-- FROM public.league_members WHERE role = 'player' ON CONFLICT DO NOTHING;
--
-- -- Scorer → viewer role + score_match permission
-- INSERT INTO public.league_member_permissions (league_id, user_id, permission, granted_at)
-- SELECT league_id, user_id, p.permission, joined_at
-- FROM public.league_members
-- CROSS JOIN (VALUES ('score_match'),('edit_profile')) AS p(permission)
-- WHERE role = 'scorer' ON CONFLICT DO NOTHING;
--
-- -- Viewer permissions (edit_profile only)
-- INSERT INTO public.league_member_permissions (league_id, user_id, permission, granted_at)
-- SELECT league_id, user_id, 'edit_profile', joined_at
-- FROM public.league_members WHERE role = 'viewer' ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- players  (league roster; user_id nullable for offline entries)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.players (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id  UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  level      TEXT NOT NULL DEFAULT 'beginner'
    CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  wins       INTEGER NOT NULL DEFAULT 0,
  losses     INTEGER NOT NULL DEFAULT 0,
  points     INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- tournaments
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournaments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id      UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  date           TEXT NOT NULL,
  team_size      INTEGER NOT NULL DEFAULT 2,
  sets_per_match INTEGER NOT NULL DEFAULT 1,
  phase          TEXT NOT NULL DEFAULT 'setup'
    CHECK (phase IN ('setup', 'group', 'knockout', 'freeplay', 'completed')),
  status         TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed')),
  winner_team_id UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- teams
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  wins          INTEGER NOT NULL DEFAULT 0,
  losses        INTEGER NOT NULL DEFAULT 0,
  points        INTEGER NOT NULL DEFAULT 0
);

-- Back-reference from tournaments to the winning team
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tournament_winner'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT fk_tournament_winner
      FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- ──────────────────────────────────────────────────────────────
-- team_players  (junction: which players are in which team)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_players (
  team_id   UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, player_id)
);

-- ──────────────────────────────────────────────────────────────
-- groups  (group-stage groupings within a tournament)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.group_teams (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  team_id  UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, team_id)
);

-- ──────────────────────────────────────────────────────────────
-- knockout_rounds
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.knockout_rounds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_key     TEXT NOT NULL,  -- 'r16' | 'qf' | 'semi' | 'final' | 'third_place'
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- ──────────────────────────────────────────────────────────────
-- matches
-- source_type: 'group' | 'knockout' | 'freeplay'
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id    UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  source_type      TEXT NOT NULL CHECK (source_type IN ('group', 'knockout', 'freeplay')),
  group_id         UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  knockout_round_id UUID REFERENCES public.knockout_rounds(id) ON DELETE SET NULL,
  team1_id         UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team2_id         UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  score1           INTEGER NOT NULL DEFAULT 0,
  score2           INTEGER NOT NULL DEFAULT 0,
  winner_id        UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  played           BOOLEAN NOT NULL DEFAULT FALSE,
  log              JSONB,
  sets             JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- free_plays
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.free_plays (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id  UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  date       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.free_play_teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  free_play_id UUID NOT NULL REFERENCES public.free_plays(id) ON DELETE CASCADE,
  name         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.free_play_team_players (
  free_play_team_id UUID NOT NULL REFERENCES public.free_play_teams(id) ON DELETE CASCADE,
  player_id         UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  PRIMARY KEY (free_play_team_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.free_play_games (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  free_play_id UUID NOT NULL REFERENCES public.free_plays(id) ON DELETE CASCADE,
  team1_id     UUID REFERENCES public.free_play_teams(id) ON DELETE SET NULL,
  team2_id     UUID REFERENCES public.free_play_teams(id) ON DELETE SET NULL,
  score1       INTEGER NOT NULL DEFAULT 0,
  score2       INTEGER NOT NULL DEFAULT 0,
  winner_id    UUID REFERENCES public.free_play_teams(id) ON DELETE SET NULL,
  played       BOOLEAN NOT NULL DEFAULT FALSE,
  log          JSONB,
  sets         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_member_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_member_permissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knockout_rounds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_plays                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_play_teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_play_team_players     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_play_games            ENABLE ROW LEVEL SECURITY;

-- ── Platform-level superadmin check ──
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  )
$$;

-- ── Legacy helper (kept for backward compat; drop after Step 9 cleanup) ──
CREATE OR REPLACE FUNCTION public.my_league_role(league UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.league_members
  WHERE league_id = league AND user_id = auth.uid()
  LIMIT 1
$$;

-- ── League-scoped helpers (all respect superadmin) ──

-- Returns true if the current user holds the given role in the league,
-- or if they are a platform superadmin.
CREATE OR REPLACE FUNCTION public.my_league_has_role(league UUID, check_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.league_member_roles
    WHERE league_id = league AND user_id = auth.uid() AND role = check_role
  )
$$;

-- Returns true if the current user has the given permission in the league,
-- or if they are a platform superadmin.
CREATE OR REPLACE FUNCTION public.my_league_has_permission(league UUID, perm TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.league_member_permissions
    WHERE league_id = league AND user_id = auth.uid() AND permission = perm
  )
$$;

-- Returns true if the current user is a member of the league,
-- or if they are a platform superadmin (bypass membership requirement).
CREATE OR REPLACE FUNCTION public.my_league_is_member(league UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.league_member_roles
    WHERE league_id = league AND user_id = auth.uid()
  )
$$;

-- ── profiles ──
DROP POLICY IF EXISTS "profiles: own row" ON public.profiles;
CREATE POLICY "profiles: own row" ON public.profiles
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles: any member can view" ON public.profiles;
CREATE POLICY "profiles: any member can view" ON public.profiles
  FOR SELECT USING (TRUE);

-- ── leagues ──
DROP POLICY IF EXISTS "leagues: members can view" ON public.leagues;
CREATE POLICY "leagues: members can view" ON public.leagues
  FOR SELECT USING (public.my_league_is_member(id));

DROP POLICY IF EXISTS "leagues: any auth user can view by invite code" ON public.leagues;
CREATE POLICY "leagues: any auth user can view by invite code" ON public.leagues
  FOR SELECT USING (TRUE);  -- invite lookup must be public for JOIN flow

DROP POLICY IF EXISTS "leagues: owner can create" ON public.leagues;
CREATE POLICY "leagues: owner can create" ON public.leagues
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "leagues: admin can update" ON public.leagues;
CREATE POLICY "leagues: admin can update" ON public.leagues
  FOR UPDATE USING (public.my_league_has_role(id, 'admin'));

DROP POLICY IF EXISTS "leagues: admin can delete" ON public.leagues;
CREATE POLICY "leagues: admin can delete" ON public.leagues
  FOR DELETE USING (public.my_league_has_role(id, 'admin'));

-- ── league_members ──
DROP POLICY IF EXISTS "members: members can view" ON public.league_members;
CREATE POLICY "members: members can view" ON public.league_members
  FOR SELECT USING (
    user_id = auth.uid() OR public.my_league_is_member(league_id)
  );

DROP POLICY IF EXISTS "members: user can join league" ON public.league_members;
CREATE POLICY "members: user can join league" ON public.league_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "members: admin can manage roles" ON public.league_members;
CREATE POLICY "members: admin can manage roles" ON public.league_members
  FOR ALL USING (public.my_league_has_role(league_id, 'admin'));

-- ── league_member_roles ──
DROP POLICY IF EXISTS "member_roles: members can view" ON public.league_member_roles;
CREATE POLICY "member_roles: members can view" ON public.league_member_roles
  FOR SELECT USING (public.my_league_is_member(league_id));

DROP POLICY IF EXISTS "member_roles: user can self-insert" ON public.league_member_roles;
CREATE POLICY "member_roles: user can self-insert" ON public.league_member_roles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "member_roles: admin can manage" ON public.league_member_roles;
CREATE POLICY "member_roles: admin can manage" ON public.league_member_roles
  FOR ALL USING (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "member_roles: user can self-delete" ON public.league_member_roles;
CREATE POLICY "member_roles: user can self-delete" ON public.league_member_roles
  FOR DELETE USING (user_id = auth.uid());

-- ── league_member_permissions ──
DROP POLICY IF EXISTS "member_perms: members can view" ON public.league_member_permissions;
CREATE POLICY "member_perms: members can view" ON public.league_member_permissions
  FOR SELECT USING (public.my_league_is_member(league_id));

DROP POLICY IF EXISTS "member_perms: user can self-insert" ON public.league_member_permissions;
CREATE POLICY "member_perms: user can self-insert" ON public.league_member_permissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "member_perms: admin can manage" ON public.league_member_permissions;
CREATE POLICY "member_perms: admin can manage" ON public.league_member_permissions
  FOR ALL USING (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "member_perms: user can self-delete" ON public.league_member_permissions;
CREATE POLICY "member_perms: user can self-delete" ON public.league_member_permissions
  FOR DELETE USING (user_id = auth.uid());

-- ── players ──
DROP POLICY IF EXISTS "players: members can view" ON public.players;
CREATE POLICY "players: members can view" ON public.players
  FOR SELECT USING (public.my_league_is_member(league_id));

DROP POLICY IF EXISTS "players: admin can insert" ON public.players;
CREATE POLICY "players: admin can insert" ON public.players
  FOR INSERT WITH CHECK (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "players: admin can update" ON public.players;
CREATE POLICY "players: admin can update" ON public.players
  FOR UPDATE USING (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "players: admin can delete" ON public.players;
CREATE POLICY "players: admin can delete" ON public.players
  FOR DELETE USING (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "players: user can self-unlink" ON public.players;
CREATE POLICY "players: user can self-unlink" ON public.players
  FOR UPDATE USING (user_id = auth.uid());

-- ── tournaments ──
DROP POLICY IF EXISTS "tournaments: members can view" ON public.tournaments;
CREATE POLICY "tournaments: members can view" ON public.tournaments
  FOR SELECT USING (public.my_league_is_member(league_id));

DROP POLICY IF EXISTS "tournaments: admin can insert" ON public.tournaments;
CREATE POLICY "tournaments: admin can insert" ON public.tournaments
  FOR INSERT WITH CHECK (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "tournaments: admin can update" ON public.tournaments;
CREATE POLICY "tournaments: admin can update" ON public.tournaments
  FOR UPDATE USING (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "tournaments: admin can delete" ON public.tournaments;
CREATE POLICY "tournaments: admin can delete" ON public.tournaments
  FOR DELETE USING (public.my_league_has_role(league_id, 'admin'));

-- ── teams ──
DROP POLICY IF EXISTS "teams: members can view" ON public.teams;
CREATE POLICY "teams: members can view" ON public.teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = teams.tournament_id
            AND public.my_league_is_member(t.league_id))
  );

DROP POLICY IF EXISTS "teams: admin can manage" ON public.teams;
CREATE POLICY "teams: admin can manage" ON public.teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = teams.tournament_id
            AND public.my_league_has_role(t.league_id, 'admin'))
  );

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

-- ── team_players ──
DROP POLICY IF EXISTS "team_players: members can view" ON public.team_players;
CREATE POLICY "team_players: members can view" ON public.team_players
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teams te
            JOIN public.tournaments t ON t.id = te.tournament_id
            WHERE te.id = team_players.team_id
            AND public.my_league_is_member(t.league_id))
  );

DROP POLICY IF EXISTS "team_players: admin can manage" ON public.team_players;
CREATE POLICY "team_players: admin can manage" ON public.team_players
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.teams te
            JOIN public.tournaments t ON t.id = te.tournament_id
            WHERE te.id = team_players.team_id
            AND public.my_league_has_role(t.league_id, 'admin'))
  );

-- ── groups + group_teams ──
DROP POLICY IF EXISTS "groups: members can view" ON public.groups;
CREATE POLICY "groups: members can view" ON public.groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = groups.tournament_id
            AND public.my_league_is_member(t.league_id))
  );

DROP POLICY IF EXISTS "groups: admin can manage" ON public.groups;
CREATE POLICY "groups: admin can manage" ON public.groups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = groups.tournament_id
            AND public.my_league_has_role(t.league_id, 'admin'))
  );

DROP POLICY IF EXISTS "group_teams: members can view" ON public.group_teams;
CREATE POLICY "group_teams: members can view" ON public.group_teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.groups g
            JOIN public.tournaments t ON t.id = g.tournament_id
            WHERE g.id = group_teams.group_id
            AND public.my_league_is_member(t.league_id))
  );

DROP POLICY IF EXISTS "group_teams: admin can manage" ON public.group_teams;
CREATE POLICY "group_teams: admin can manage" ON public.group_teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.groups g
            JOIN public.tournaments t ON t.id = g.tournament_id
            WHERE g.id = group_teams.group_id
            AND public.my_league_has_role(t.league_id, 'admin'))
  );

-- ── knockout_rounds ──
DROP POLICY IF EXISTS "knockout_rounds: members can view" ON public.knockout_rounds;
CREATE POLICY "knockout_rounds: members can view" ON public.knockout_rounds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = knockout_rounds.tournament_id
            AND public.my_league_is_member(t.league_id))
  );

DROP POLICY IF EXISTS "knockout_rounds: admin can manage" ON public.knockout_rounds;
CREATE POLICY "knockout_rounds: admin can manage" ON public.knockout_rounds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = knockout_rounds.tournament_id
            AND public.my_league_has_role(t.league_id, 'admin'))
  );

-- ── matches ──
DROP POLICY IF EXISTS "matches: members can view" ON public.matches;
CREATE POLICY "matches: members can view" ON public.matches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = matches.tournament_id
            AND public.my_league_is_member(t.league_id))
  );

DROP POLICY IF EXISTS "matches: admin or scorer can update" ON public.matches;
CREATE POLICY "matches: admin or scorer can update" ON public.matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = matches.tournament_id
            AND public.my_league_has_permission(t.league_id, 'score_match'))
  );

DROP POLICY IF EXISTS "matches: admin can insert/delete" ON public.matches;
CREATE POLICY "matches: admin can insert/delete" ON public.matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = matches.tournament_id
            AND public.my_league_has_role(t.league_id, 'admin'))
  );

DROP POLICY IF EXISTS "matches: admin can delete" ON public.matches;
CREATE POLICY "matches: admin can delete" ON public.matches
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = matches.tournament_id
            AND public.my_league_has_role(t.league_id, 'admin'))
  );

-- ── free_plays ──
DROP POLICY IF EXISTS "free_plays: members can view" ON public.free_plays;
CREATE POLICY "free_plays: members can view" ON public.free_plays
  FOR SELECT USING (
    league_id IS NULL OR public.my_league_is_member(league_id)
  );

DROP POLICY IF EXISTS "free_plays: auth user can insert" ON public.free_plays;
CREATE POLICY "free_plays: auth user can insert" ON public.free_plays
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "free_plays: auth user can update" ON public.free_plays;
CREATE POLICY "free_plays: auth user can update" ON public.free_plays
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ── free_play_teams, free_play_team_players, free_play_games ──
DROP POLICY IF EXISTS "free_play_teams: view all authenticated" ON public.free_play_teams;
CREATE POLICY "free_play_teams: view all authenticated" ON public.free_play_teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "free_play_teams: insert authenticated" ON public.free_play_teams;
CREATE POLICY "free_play_teams: insert authenticated" ON public.free_play_teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "fpt_players: view all authenticated" ON public.free_play_team_players;
CREATE POLICY "fpt_players: view all authenticated" ON public.free_play_team_players
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "fpt_players: insert authenticated" ON public.free_play_team_players;
CREATE POLICY "fpt_players: insert authenticated" ON public.free_play_team_players
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "free_play_games: view all authenticated" ON public.free_play_games;
CREATE POLICY "free_play_games: view all authenticated" ON public.free_play_games
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "free_play_games: insert authenticated" ON public.free_play_games;
CREATE POLICY "free_play_games: insert authenticated" ON public.free_play_games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "free_play_games: update authenticated" ON public.free_play_games;
CREATE POLICY "free_play_games: update authenticated" ON public.free_play_games
  FOR UPDATE USING (auth.uid() IS NOT NULL);
