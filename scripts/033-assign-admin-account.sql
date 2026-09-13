-- First create a separate account through BigCat signup and verify its email.
-- Replace the email below. Keep your merchant account as a merchant.
BEGIN;
DO $$
DECLARE
  admin_email text := 'REPLACE_WITH_YOUR_ADMIN_EMAIL';
  matched_count integer;
BEGIN
  IF admin_email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL' THEN
    RAISE EXCEPTION 'Replace the admin email before running this script.';
  END IF;
  SELECT count(*) INTO matched_count
  FROM public.auth_users p JOIN auth.users a ON p.id::text = a.id::text
  WHERE lower(p.email) = lower(admin_email) AND a.email_confirmed_at IS NOT NULL;
  IF matched_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one registered account with a verified email is required.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.auth_users WHERE lower(email) = lower(admin_email) AND role = 'merchant') THEN
    RAISE EXCEPTION 'Use a separate account so your merchant access is preserved.';
  END IF;
  -- This is the role constraint from the legacy schema shipped in this project.
  ALTER TABLE public.auth_users DROP CONSTRAINT IF EXISTS auth_users_role_check;
  ALTER TABLE public.auth_users ADD CONSTRAINT auth_users_role_check
    CHECK (role IN ('buyer', 'merchant', 'admin', 'orchid_admin', 'trade_logistics_admin', 'support'));
  UPDATE public.auth_users SET role = 'admin'
  WHERE lower(email) = lower(admin_email);
END $$;
COMMIT;
