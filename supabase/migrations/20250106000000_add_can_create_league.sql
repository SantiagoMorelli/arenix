-- 1. Add the column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_create_league BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Allow SuperAdmins to update other users' profiles
DROP POLICY IF EXISTS "profiles: superadmin can update" ON public.profiles;
CREATE POLICY "profiles: superadmin can update" ON public.profiles
  FOR UPDATE USING (public.is_super_admin());
