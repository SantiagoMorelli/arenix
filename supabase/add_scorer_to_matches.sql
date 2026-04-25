ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS scorer_user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scorer_started_at TIMESTAMPTZ;
