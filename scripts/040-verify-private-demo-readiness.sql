-- Read-only preflight. Run in Supabase SQL Editor and review every result.
-- Do NOT run seed 038 until schema and policies have been reviewed.

-- Required tables and columns (missing rows indicate schema drift).
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('auth_users', 'products', 'orders', 'order_items', 'bigcat_demo_merchants', 'bigcat_demo_products')
  AND column_name IN ('id', 'email', 'name', 'role', 'business_name', 'setup_completed', 'merchant_id', 'product_id', 'description', 'price', 'category', 'stock', 'is_active', 'status', 'fixture_batch')
ORDER BY table_name, column_name;

-- Check whether existing policies could expose demo products.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'auth_users', 'bigcat_demo_merchants', 'bigcat_demo_products')
ORDER BY tablename, policyname;

-- Confirm RLS state on every relevant table.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('products', 'auth_users', 'bigcat_demo_merchants', 'bigcat_demo_products')
ORDER BY c.relname;

-- Verify constraints, including product/merchant ownership and order references.
SELECT conrelid::regclass::text AS table_name, conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.auth_users'::regclass, 'public.products'::regclass, 'public.order_items'::regclass)
ORDER BY table_name, conname;

-- Detect any pre-existing rows using reserved pilot IDs before seeding.
SELECT 'auth_users' AS source, id::text, email AS label
FROM public.auth_users
WHERE id IN ('b23b0000-0000-4000-8000-000000000001', 'b23b0000-0000-4000-8000-000000000002', 'b23b0000-0000-4000-8000-000000000003')
UNION ALL
SELECT 'products', id::text, name
FROM public.products
WHERE id IN ('b23b1000-0000-4000-8000-000000000001', 'b23b1000-0000-4000-8000-000000000002', 'b23b1000-0000-4000-8000-000000000003', 'b23b1000-0000-4000-8000-000000000004', 'b23b1000-0000-4000-8000-000000000005', 'b23b1000-0000-4000-8000-000000000006');
