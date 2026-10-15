-- Run only after the pilot. Abort if orders reference any fixture product or merchant.
BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.order_items oi JOIN public.bigcat_demo_products dp ON dp.product_id = oi.product_id WHERE dp.fixture_batch = 'b23b-pilot') THEN
   RAISE EXCEPTION 'Demo products are referenced by orders; manual review required';
 END IF;
 IF EXISTS (SELECT 1 FROM public.order_items oi JOIN public.bigcat_demo_merchants dm ON dm.merchant_id = oi.merchant_id WHERE dm.fixture_batch = 'b23b-pilot') THEN
   RAISE EXCEPTION 'Demo merchants are referenced by orders; manual review required';
 END IF;
END $$;
DELETE FROM public.products WHERE id IN (SELECT product_id FROM public.bigcat_demo_products WHERE fixture_batch = 'b23b-pilot');
DELETE FROM public.auth_users WHERE id IN (SELECT merchant_id FROM public.bigcat_demo_merchants WHERE fixture_batch = 'b23b-pilot');
COMMIT;
