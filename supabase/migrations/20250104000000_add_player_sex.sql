-- Add sex field to players table.
-- Values: 'M' (Male), 'F' (Female), NULL (not specified).
-- Used by the tournament setup wizard to balance teams by gender.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IS NULL OR sex IN ('M', 'F'));
