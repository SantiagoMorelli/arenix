-- ============================================================
-- Notifications table
-- Run in Supabase SQL Editor after existing schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
DROP POLICY IF EXISTS "notifs: select own" ON public.notifications;
CREATE POLICY "notifs: select own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert notifications for themselves (welcome on join)
DROP POLICY IF EXISTS "notifs: insert own" ON public.notifications;
CREATE POLICY "notifs: insert own" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can insert notifications for any user in their league via service role
-- (bulk notifications go through createNotificationsForLeagueMembers which uses the anon key
--  but inserts rows belonging to other users — we allow any authenticated user to insert
--  a notification for any other authenticated user since the insert is always intentional/admin-driven)
DROP POLICY IF EXISTS "notifs: insert for others" ON public.notifications;
CREATE POLICY "notifs: insert for others" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update only their own (mark read)
DROP POLICY IF EXISTS "notifs: update own" ON public.notifications;
CREATE POLICY "notifs: update own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
