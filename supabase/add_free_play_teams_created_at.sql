-- Free Play Teams — add created_at + helper index
-- Run this in the Supabase SQL Editor.
--
-- Context: the base schema defined free_play_teams without a created_at column,
-- but freePlayService.getFreePlay orders by created_at for consistency with
-- sibling tables (free_plays, free_play_players, free_play_games). Without the
-- column, PostgREST returns 400 Bad Request on that query, which in turn causes
-- session.teams to come back empty — blocking the Start Match flow.

ALTER TABLE public.free_play_teams
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_fpt_free_play_id
  ON public.free_play_teams(free_play_id);
