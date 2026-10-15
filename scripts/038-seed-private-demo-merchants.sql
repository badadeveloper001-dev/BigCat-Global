-- Private pilot fixture identities; run only after the application is ready.
BEGIN;
INSERT INTO public.auth_users (id, email, name, role, business_name, setup_completed)
VALUES
  ('b23b0000-0000-4000-8000-000000000001', 'pilot-electronics@example.invalid', 'Pilot Electronics', 'merchant', 'BigCat Demo Electronics', true),
  ('b23b0000-0000-4000-8000-000000000002', 'pilot-fashion@example.invalid', 'Pilot Fashion', 'merchant', 'BigCat Demo Fashion', true),
  ('b23b0000-0000-4000-8000-000000000003', 'pilot-home@example.invalid', 'Pilot Home', 'merchant', 'BigCat Demo Home', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.bigcat_demo_merchants (merchant_id)
VALUES
  ('b23b0000-0000-4000-8000-000000000001'),
  ('b23b0000-0000-4000-8000-000000000002'),
  ('b23b0000-0000-4000-8000-000000000003')
ON CONFLICT (merchant_id) DO NOTHING;
COMMIT;
