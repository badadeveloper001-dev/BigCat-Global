-- Test-only transaction ledger. Apply in an isolated pilot database.
ALTER TABLE public.auth_users
 ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'NG',
 ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
 ADD COLUMN IF NOT EXISTS government_id_number TEXT,
 ADD COLUMN IF NOT EXISTS bank_verification_ref TEXT,
 ADD COLUMN IF NOT EXISTS verification_module TEXT,
 ADD COLUMN IF NOT EXISTS verification_status TEXT,
 ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.orders
 ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN',
 ADD COLUMN IF NOT EXISTS fx_rates JSONB,
 ADD COLUMN IF NOT EXISTS pay_currency TEXT,
 ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18,2),
 ADD COLUMN IF NOT EXISTS escrow_status TEXT,
 ADD COLUMN IF NOT EXISTS merchant_amount NUMERIC(18,2);
CREATE TABLE IF NOT EXISTS public.user_wallets (
 user_id UUID REFERENCES public.auth_users(id) ON DELETE CASCADE,
 currency TEXT CHECK(currency IN ('NGN','CNY','USD')),
 balance NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK(balance >= 0),
 locked_balance NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK(locked_balance >= 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,currency)
);
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES public.auth_users(id),
 currency TEXT NOT NULL, type TEXT NOT NULL, amount NUMERIC(18,2) NOT NULL,
 balance_after NUMERIC(18,2) NOT NULL, reference TEXT UNIQUE,
 order_id UUID REFERENCES public.orders(id), description TEXT, fx_rate NUMERIC,
 is_test BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.pilot_attempts (
 buyer_id UUID NOT NULL REFERENCES public.auth_users(id), request_key TEXT NOT NULL,
 payload_hash TEXT NOT NULL, result JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(buyer_id,request_key)
);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_attempts ENABLE ROW LEVEL SECURITY;
-- All mutations use authenticated server paths. Private tables have no browser grants.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON public.products, public.reviews TO anon, authenticated;
GRANT SELECT ON public.auth_users, public.orders, public.user_notifications TO authenticated;
-- No client may directly change balances, roles, order/payment states, or inventory.
REVOKE INSERT, UPDATE, DELETE ON public.auth_users, public.orders, public.order_items,
 public.escrow, public.products, public.service_bills, public.service_bookings, public.user_wallets, public.wallet_transactions, public.pilot_attempts
 FROM anon, authenticated;
GRANT ALL ON public.user_wallets, public.wallet_transactions, public.pilot_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.pilot_checkout(p_buyer_id UUID,p_key TEXT,p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 previous RECORD; receipt JSONB; result JSONB; order_row RECORD;
 order_id UUID := gen_random_uuid(); current_balance NUMERIC; debit NUMERIC;
 rate NUMERIC; payment_currency TEXT := p_payload->>'payCurrency';
BEGIN
 IF p_key IS NULL OR length(p_key) < 16 OR length(p_key) > 100 THEN RAISE EXCEPTION 'Invalid request ID'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_buyer_id::text || ':' || p_key,0));
 SELECT * INTO previous FROM pilot_attempts WHERE buyer_id=p_buyer_id AND request_key=p_key;
 IF FOUND THEN
   IF previous.payload_hash <> COALESCE(p_payload->>'requestHash',md5(p_payload::text)) THEN RAISE EXCEPTION 'Request ID already used for a different checkout'; END IF;
   RETURN previous.result || jsonb_build_object('replayed',true);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM auth_users WHERE id=p_buyer_id AND role='buyer' AND NOT is_suspended) THEN RAISE EXCEPTION 'Buyer unavailable'; END IF;
 IF payment_currency IS NULL OR p_payload->>'outcome' IS NULL OR payment_currency NOT IN ('NGN','CNY','USD') OR p_payload->>'outcome' NOT IN ('success','failed','cancelled') THEN RAISE EXCEPTION 'Invalid test options'; END IF;
 IF p_payload->>'outcome' <> 'success' THEN
   result := jsonb_build_object('success',false,'outcome',p_payload->>'outcome','isTest',true,'error','Test payment ' || (p_payload->>'outcome') || '. No money moved.');
   INSERT INTO pilot_attempts VALUES(p_buyer_id,p_key,COALESCE(p_payload->>'requestHash',md5(p_payload::text)),result,now());
   RETURN result;
 END IF;
 receipt := create_marketplace_order_atomic(
   order_id,p_buyer_id,(p_payload->>'merchantId')::uuid,p_payload->>'deliveryType',
   p_payload->>'deliveryAddress','test',(p_payload->>'deliveryFee')::numeric,
   (p_payload->>'promotionId')::uuid,(p_payload->>'promotionDiscount')::numeric,
   (p_payload->>'couponId')::uuid,p_payload->>'couponCode',(p_payload->>'couponDiscount')::numeric,
   CASE WHEN p_payload->>'deliveryType'='pickup' THEN upper(replace(gen_random_uuid()::text,'-','')) ELSE NULL END,
   p_buyer_id::text || ':' || p_key,p_payload->'items'
 );
 order_id := (receipt->>'id')::uuid;
 rate := CASE payment_currency WHEN 'NGN' THEN 1600 WHEN 'CNY' THEN 7.2 ELSE 1 END;
 debit := round((receipt->>'grandTotal')::numeric / 1600 * rate,2);
 IF p_payload->>'method'='wallet' THEN
   INSERT INTO user_wallets(user_id,currency) VALUES(p_buyer_id,payment_currency) ON CONFLICT DO NOTHING;
   SELECT balance INTO current_balance FROM user_wallets WHERE user_id=p_buyer_id AND currency=payment_currency FOR UPDATE;
   IF current_balance < debit THEN RAISE EXCEPTION 'Insufficient test wallet balance'; END IF;
   UPDATE user_wallets SET balance=balance-debit,updated_at=now() WHERE user_id=p_buyer_id AND currency=payment_currency;
   INSERT INTO wallet_transactions(user_id,currency,type,amount,balance_after,order_id,reference,description)
   VALUES(p_buyer_id,payment_currency,'payment',debit,current_balance-debit,order_id,'pay:'||order_id,'Test transaction - no money moved');
 END IF;
 UPDATE orders SET is_test=true,status='paid',payment_status='completed',escrow_status='held',
 currency='NGN',fx_rates='{"USD":1,"NGN":1600,"CNY":7.2}',pay_currency=payment_currency,
 merchant_amount=GREATEST((receipt->>'productTotal')::numeric-(receipt->>'promotionDiscount')::numeric-(receipt->>'couponDiscount')::numeric,0),
 paid_amount=debit,payment_method=CASE WHEN p_payload->>'method'='wallet' THEN 'test_wallet' ELSE 'test' END
 WHERE id=order_id RETURNING * INTO order_row;
 INSERT INTO escrow(order_id,type,amount,recipient_id,status)
 VALUES(order_id,'product',order_row.merchant_amount,order_row.merchant_id,'held'),
 (order_id,'delivery',order_row.delivery_fee,NULL,'held');
 result := jsonb_build_object('success',true,'isTest',true,'data',jsonb_build_object('id',order_id,'orderId',order_id,'orders',jsonb_build_array(to_jsonb(order_row))));
 INSERT INTO pilot_attempts VALUES(p_buyer_id,p_key,COALESCE(p_payload->>'requestHash',md5(p_payload::text)),result,now());
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.pilot_wallet_change(p_user_id UUID,p_currency TEXT,p_amount NUMERIC,p_key TEXT,p_target TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b NUMERIC; target_amount NUMERIC; r_from NUMERIC; r_to NUMERIC; prior RECORD; result JSONB; fingerprint TEXT := md5(jsonb_build_array(p_currency,p_amount,p_target)::text);
BEGIN
 IF p_key IS NULL OR length(p_key)>100 OR p_currency IS NULL OR p_amount IS NULL OR p_currency NOT IN ('NGN','USD','CNY') OR p_amount <= 0 OR p_amount > 1000000 OR p_amount <> round(p_amount,2) OR length(p_key)<16 THEN RAISE EXCEPTION 'Invalid test wallet request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,1));
 SELECT * INTO prior FROM pilot_attempts WHERE buyer_id=p_user_id AND request_key='wallet:'||p_key;
 IF FOUND THEN
   IF prior.payload_hash<>fingerprint THEN RAISE EXCEPTION 'Request ID already used for another wallet operation'; END IF;
   RETURN prior.result || jsonb_build_object('replayed',true);
 END IF;
 INSERT INTO user_wallets(user_id,currency) VALUES(p_user_id,p_currency) ON CONFLICT DO NOTHING;
 SELECT balance INTO b FROM user_wallets WHERE user_id=p_user_id AND currency=p_currency FOR UPDATE;
 IF p_target IS NULL THEN
   IF b+p_amount > 10000000 THEN RAISE EXCEPTION 'Test balance limit reached'; END IF;
   UPDATE user_wallets SET balance=b+p_amount,updated_at=now() WHERE user_id=p_user_id AND currency=p_currency;
   INSERT INTO wallet_transactions(user_id,currency,type,amount,balance_after,reference,description)
   VALUES(p_user_id,p_currency,'credit',p_amount,b+p_amount,p_user_id::text||':'||p_key,'Test funds - no money moved');
   result:=jsonb_build_object('success',true,'balance',b+p_amount,'isTest',true);
   INSERT INTO pilot_attempts VALUES(p_user_id,'wallet:'||p_key,fingerprint,result,now());
   RETURN result;
 END IF;
 IF p_target NOT IN ('NGN','USD','CNY') OR p_target=p_currency OR b<p_amount THEN RAISE EXCEPTION 'Invalid conversion or insufficient test balance'; END IF;
 r_from := CASE p_currency WHEN 'NGN' THEN 1600 WHEN 'CNY' THEN 7.2 ELSE 1 END;
 r_to := CASE p_target WHEN 'NGN' THEN 1600 WHEN 'CNY' THEN 7.2 ELSE 1 END;
 target_amount := trunc(p_amount/r_from*r_to,2);
 IF target_amount<=0 THEN RAISE EXCEPTION 'Amount is too small to convert'; END IF;
 INSERT INTO user_wallets(user_id,currency) VALUES(p_user_id,p_target) ON CONFLICT DO NOTHING;
 UPDATE user_wallets SET balance=balance-p_amount,updated_at=now() WHERE user_id=p_user_id AND currency=p_currency;
 UPDATE user_wallets SET balance=balance+target_amount,updated_at=now() WHERE user_id=p_user_id AND currency=p_target;
 INSERT INTO wallet_transactions(user_id,currency,type,amount,balance_after,reference,description)
 VALUES(p_user_id,p_currency,'convert_out',p_amount,b-p_amount,p_user_id::text||':'||p_key,'Test conversion'),
 (p_user_id,p_target,'convert_in',target_amount,(SELECT balance FROM user_wallets WHERE user_id=p_user_id AND currency=p_target),p_user_id::text||':'||p_key||':in','Test conversion');
 result:=jsonb_build_object('success',true,'toAmount',target_amount,'isTest',true);
 INSERT INTO pilot_attempts VALUES(p_user_id,'wallet:'||p_key,fingerprint,result,now());
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.pilot_transition_order(p_order_id UUID,p_actor_id UUID,p_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o RECORD; actor_role TEXT; wallet_balance NUMERIC; refund_amount NUMERIC;
BEGIN
 SELECT role INTO actor_role FROM auth_users WHERE id=p_actor_id AND NOT is_suspended;
 SELECT * INTO o FROM orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR NOT o.is_test THEN RAISE EXCEPTION 'Test order not found'; END IF;
 IF actor_role IS NULL OR (actor_role<>'admin' AND p_actor_id<>o.buyer_id AND p_actor_id<>o.merchant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF p_status=o.status THEN RETURN jsonb_build_object('success',true,'data',to_jsonb(o)); END IF;
 IF o.status IN ('cancelled','delivered') THEN RAISE EXCEPTION 'Order is already finalized'; END IF;
 IF NOT (
   (p_actor_id=o.merchant_id AND ((p_status='order_received' AND o.status='paid') OR (p_status='order_packed' AND o.status='order_received') OR (p_status='order_taken_for_delivery' AND o.status='order_packed'))) OR
   (p_actor_id=o.buyer_id AND ((p_status='delivered' AND (o.status='completed' OR (o.delivery_type='pickup' AND o.status='order_packed'))) OR (p_status='cancelled' AND o.status IN ('paid','order_received','order_packed')))) OR
   (actor_role='admin' AND p_status IN ('cancelled','completed','in_transit'))
 ) THEN RAISE EXCEPTION 'Invalid order transition'; END IF;
 IF p_status IN ('cancelled','delivered') THEN
   IF EXISTS(SELECT 1 FROM support_issues WHERE order_id=p_order_id AND status IN ('open','in_review')) THEN RAISE EXCEPTION 'Resolve the dispute before finalizing this order'; END IF;
 END IF;
 IF p_status='cancelled' THEN
   IF actor_role<>'admin' AND EXISTS(SELECT 1 FROM logistics_order_assignments WHERE order_id::text=p_order_id::text AND (rider_id IS NOT NULL OR logistics_status IN ('assigned','in_transit','return_assigned','return_in_transit'))) THEN RAISE EXCEPTION 'Rider already assigned; contact support'; END IF;
   UPDATE products p SET stock=p.stock+i.quantity FROM (SELECT product_id,sum(quantity) quantity FROM order_items WHERE order_id=p_order_id GROUP BY product_id) i WHERE p.id=i.product_id;
   IF o.payment_method='test_wallet' THEN
     INSERT INTO user_wallets(user_id,currency) VALUES(o.buyer_id,o.pay_currency) ON CONFLICT DO NOTHING;
     UPDATE user_wallets SET balance=balance+o.paid_amount,updated_at=now() WHERE user_id=o.buyer_id AND currency=o.pay_currency RETURNING balance INTO wallet_balance;
     INSERT INTO wallet_transactions(user_id,currency,type,amount,balance_after,order_id,reference,description)
     VALUES(o.buyer_id,o.pay_currency,'refund',o.paid_amount,wallet_balance,p_order_id,'refund:'||p_order_id,'Test refund - no money moved');
   END IF;
   UPDATE escrow SET status='refunded' WHERE order_id=p_order_id;
 ELSIF p_status='delivered' THEN
   refund_amount := o.merchant_amount;
   INSERT INTO user_wallets(user_id,currency) VALUES(o.merchant_id,'NGN') ON CONFLICT DO NOTHING;
   UPDATE user_wallets SET balance=balance+refund_amount,updated_at=now() WHERE user_id=o.merchant_id AND currency='NGN' RETURNING balance INTO wallet_balance;
   INSERT INTO wallet_transactions(user_id,currency,type,amount,balance_after,order_id,reference,description)
   VALUES(o.merchant_id,'NGN','escrow_release',refund_amount,wallet_balance,p_order_id,'release:'||p_order_id,'Test escrow release - no money moved');
   UPDATE escrow SET status='released',released_at=now() WHERE order_id=p_order_id;
 END IF;
 UPDATE orders SET status=p_status,updated_at=now(),payment_status=CASE WHEN p_status='cancelled' THEN 'refunded' ELSE payment_status END,
 escrow_status=CASE WHEN p_status='cancelled' THEN 'refunded' WHEN p_status='delivered' THEN 'released' ELSE escrow_status END
 WHERE id=p_order_id RETURNING * INTO o;
 RETURN jsonb_build_object('success',true,'isTest',true,'data',to_jsonb(o));
END $$;
REVOKE ALL ON FUNCTION public.pilot_checkout(UUID,TEXT,JSONB), public.pilot_wallet_change(UUID,TEXT,NUMERIC,TEXT,TEXT), public.pilot_transition_order(UUID,UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_checkout(UUID,TEXT,JSONB), public.pilot_wallet_change(UUID,TEXT,NUMERIC,TEXT,TEXT), public.pilot_transition_order(UUID,UUID,TEXT) TO service_role;
