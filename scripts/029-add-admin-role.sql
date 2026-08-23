-- Allow authenticated administrator profiles.
-- Admin users must first be created in Supabase Auth, then their matching
-- auth_users profile may be assigned the admin role by a trusted operator.

ALTER TABLE public.auth_users
  DROP CONSTRAINT IF EXISTS auth_users_role_check;

ALTER TABLE public.auth_users
  ADD CONSTRAINT auth_users_role_check
  CHECK (role IN ('buyer', 'merchant', 'admin'));

CREATE INDEX IF NOT EXISTS idx_auth_users_admin_role
  ON public.auth_users (role)
  WHERE role = 'admin';
