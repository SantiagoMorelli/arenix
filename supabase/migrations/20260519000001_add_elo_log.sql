-- Add elo_log column to store the audit trail of the Elo calculations
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS elo_log TEXT;
