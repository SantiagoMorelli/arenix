-- Add elo column to players
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS elo INTEGER NOT NULL DEFAULT 1000;

-- Add elo_processed column to tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS elo_processed BOOLEAN NOT NULL DEFAULT FALSE;
