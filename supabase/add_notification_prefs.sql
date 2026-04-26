-- Add notification preference column to profiles.
-- Default: all categories enabled.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL
  DEFAULT '{"match_reminders":true,"tournament_updates":true,"league_invites":true}';
