-- Add location and visibility fields to leagues table
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS location   TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private'));
