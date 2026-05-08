-- ============================================================
-- Migration: scoring_config — Phase 2 (scoring configuration)
-- Run in Supabase SQL Editor on any existing database.
-- No DEFAULT: null means "inherit / use legacy default" (→ Level 3).
-- ============================================================
ALTER TABLE public.leagues     ADD COLUMN IF NOT EXISTS scoring_config JSONB;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS scoring_config JSONB;
