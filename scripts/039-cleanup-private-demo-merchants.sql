-- Run only after the pilot. Abort if orders reference any fixture product or merchant.
BEGIN;
DO $cleanup$
BEGIN
 IF EXISTS (SELECT 1 FROM public.order_items oi JOIN public.bigcat_demo_products dp ON dp.product_id = oi.product_id WHERE dp.fixture_batch = 'b23b-pilot') THEN
   RAISE EXCEPTION 'Demo products are referenced by orders; manual review required';
 END IF;
 IF EXISTS (SELECT 1 FROM public.order_items oi JOIN public.bigcat_demo_merchants dm ON dm.merchant_id = oi.merchant_id WHERE dm.fixture_batch = 'b23b-pilot') THEN
   RAISE EXCEPTION 'Demo merchants are referenced by orders; manual review required';
 END IF;

 IF (SELECT COUNT(*) FROM public.bigcat_demo_merchants WHERE fixture_batch = 'b23b-pilot') <> 3
 OR (SELECT COUNT(*) FROM public.bigcat_demo_products WHERE fixture_batch = 'b23b-pilot') <> 6 THEN
   RAISE EXCEPTION 'Unexpected fixture count; cleanup aborted';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.bigcat_demo_merchants
   WHERE fixture_batch = 'b23b-pilot'
   AND merchant_id NOT IN (
     'b23b0000-0000-4000-8000-000000000001',
     'b23b0000-0000-4000-8000-000000000002',
     'b23b0000-0000-4000-8000-000000000003')
 ) THEN
   RAISE EXCEPTION 'Unexpected fixture merchant ID; cleanup aborted';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.bigcat_demo_products
   WHERE fixture_batch = 'b23b-pilot'
   AND product_id NOT IN (
     'b23b1000-0000-4000-8000-000000000001',
     'b23b1000-0000-4000-8000-000000000002',
     'b23b1000-0000-4000-8000-000000000003',
     'b23b1000-0000-4000-8000-000000000004',
     'b23b1000-0000-4000-8000-000000000005',
     'b23b1000-0000-4000-8000-000000000006')
 ) THEN
   RAISE EXCEPTION 'Unexpected fixture product ID; cleanup aborted';
 END IF;

 -- Block cleanup if any other public table references fixture users or products.
 -- Dynamic checks use actual FK metadata and include future schema additions.
 DECLARE
   dependency RECORD;
   found_reference BOOLEAN;
 BEGIN
   FOR dependency IN
     SELECT child_ns.nspname AS schema_name, child.relname AS table_name,
            child_col.attname AS column_name, parent.relname AS parent_table
     FROM pg_constraint fk
     JOIN pg_class child ON child.oid = fk.conrelid
     JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
     JOIN pg_class parent ON parent.oid = fk.confrelid
     JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
     JOIN LATERAL unnest(fk.conkey, fk.confkey) AS cols(child_attnum, parent_attnum) ON true
     JOIN pg_attribute child_col ON child_col.attrelid = child.oid AND child_col.attnum = cols.child_attnum
     WHERE fk.contype = 'f' AND array_length(fk.conkey, 1) = 1
       AND parent_ns.nspname = 'public' AND child_ns.nspname = 'public'
       AND parent.relname IN ('auth_users', 'products')
       AND child.relname NOT IN ('products', 'bigcat_demo_merchants', 'bigcat_demo_products')
   LOOP
     EXECUTE format(
       'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I IN (SELECT %s FROM public.%s WHERE fixture_batch = %L))',
       dependency.schema_name, dependency.table_name, dependency.column_name,
       CASE WHEN dependency.parent_table = 'products' THEN 'product_id' ELSE 'merchant_id' END,
       CASE WHEN dependency.parent_table = 'products' THEN 'bigcat_demo_products' ELSE 'bigcat_demo_merchants' END,
       'b23b-pilot'
     ) INTO found_reference;
     IF found_reference THEN
       RAISE EXCEPTION 'Dependent records in %.% column %; manual review required',
         dependency.schema_name, dependency.table_name, dependency.column_name;
     END IF;
   END LOOP;
 END;
END $cleanup$;
DELETE FROM public.products WHERE id IN (SELECT product_id FROM public.bigcat_demo_products WHERE fixture_batch = 'b23b-pilot');
DELETE FROM public.auth_users WHERE id IN (SELECT merchant_id FROM public.bigcat_demo_merchants WHERE fixture_batch = 'b23b-pilot');
COMMIT;
