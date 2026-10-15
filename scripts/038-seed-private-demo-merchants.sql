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

-- Products are clearly marked as non-purchasable demo fixtures.
INSERT INTO public.products (id, merchant_id, name, description, price, category, stock, is_active, status)
VALUES
('b23b1000-0000-4000-8000-000000000001','b23b0000-0000-4000-8000-000000000001','Demo Bluetooth Speaker','Test fixture. Not available for purchase.',24500,'Electronics',25,true,'active'),
('b23b1000-0000-4000-8000-000000000002','b23b0000-0000-4000-8000-000000000001','Demo Wireless Headphones','Test fixture. Not available for purchase.',38500,'Electronics',25,true,'active'),
('b23b1000-0000-4000-8000-000000000003','b23b0000-0000-4000-8000-000000000002','Demo Cotton T-Shirt','Test fixture. Not available for purchase.',12500,'Fashion',25,true,'active'),
('b23b1000-0000-4000-8000-000000000004','b23b0000-0000-4000-8000-000000000002','Demo Casual Sneakers','Test fixture. Not available for purchase.',29500,'Fashion',25,true,'active'),
('b23b1000-0000-4000-8000-000000000005','b23b0000-0000-4000-8000-000000000003','Demo Desk Lamp','Test fixture. Not available for purchase.',18000,'Home',25,true,'active'),
('b23b1000-0000-4000-8000-000000000006','b23b0000-0000-4000-8000-000000000003','Demo Storage Organizer','Test fixture. Not available for purchase.',14500,'Home',25,true,'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.bigcat_demo_products (product_id, merchant_id)
SELECT id, merchant_id FROM public.products WHERE id IN (
'b23b1000-0000-4000-8000-000000000001','b23b1000-0000-4000-8000-000000000002',
'b23b1000-0000-4000-8000-000000000003','b23b1000-0000-4000-8000-000000000004',
'b23b1000-0000-4000-8000-000000000005','b23b1000-0000-4000-8000-000000000006')
ON CONFLICT (product_id) DO NOTHING;
COMMIT;
