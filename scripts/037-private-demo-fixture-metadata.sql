-- B2.3B marker tables. Do not apply until application guards are reviewed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.bigcat_demo_merchants (
 merchant_id UUID PRIMARY KEY REFERENCES public.auth_users(id) ON DELETE CASCADE,
 fixture_batch TEXT NOT NULL DEFAULT 'b23b-pilot',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.bigcat_demo_products (
 product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
 merchant_id UUID NOT NULL REFERENCES public.bigcat_demo_merchants(merchant_id) ON DELETE CASCADE,
 fixture_batch TEXT NOT NULL DEFAULT 'b23b-pilot',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.bigcat_demo_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bigcat_demo_products ENABLE ROW LEVEL SECURITY;
-- Block public and authenticated direct reads of synthetic fixture products.
-- The service role used by approved server-side routes bypasses RLS.
DROP POLICY IF EXISTS private_demo_products_select_guard ON public.products;
CREATE POLICY private_demo_products_select_guard ON public.products
  AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (NOT EXISTS (
    SELECT 1 FROM public.bigcat_demo_products AS fixture
    WHERE fixture.product_id = products.id
  ));
COMMIT;
