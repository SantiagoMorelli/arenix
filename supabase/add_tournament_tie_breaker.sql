-- Migration: add tie_breaker_config column to tournaments
-- Run this once against your Supabase project.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS tie_breaker_config jsonb NOT NULL
    DEFAULT '{"tieBreakerMode":"id","seedMap":{},"drawMap":{}}'::jsonb;
