-- Service payments use simulated settlement only during this pilot.
ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE service_bills ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION pilot_service_checkout(p_buyer uuid,p_key text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prior record; bill service_bills%ROWTYPE; listing service_listings%ROWTYPE; booking service_bookings%ROWTYPE; result jsonb; amount numeric; service_id uuid;
BEGIN
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 16 AND 100 THEN RAISE EXCEPTION 'Invalid request ID'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth_users WHERE id=p_buyer AND role='buyer' AND NOT is_suspended) THEN RAISE EXCEPTION 'Access denied'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_buyer::text||':'||p_key,0));
 SELECT * INTO prior FROM pilot_attempts WHERE buyer_id=p_buyer AND request_key=p_key;
 IF FOUND THEN
  IF prior.payload_hash<>md5(p_payload::text) THEN RAISE EXCEPTION 'Request ID already used'; END IF;
  RETURN prior.result || jsonb_build_object('replayed',true);
 END IF;
 IF p_payload->>'outcome' IS NULL OR p_payload->>'outcome' NOT IN ('success','failed','cancelled') THEN RAISE EXCEPTION 'Invalid test outcome'; END IF;
 IF p_payload->>'outcome'<>'success' THEN
  result:=jsonb_build_object('success',false,'isTest',true,'outcome',p_payload->>'outcome','error','Test payment did not complete. No money moved.');
 ELSE
  IF length(trim(COALESCE(p_payload->>'address',''))) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Service address required'; END IF;
  IF p_payload->>'billId' IS NOT NULL THEN
   SELECT * INTO bill FROM service_bills WHERE id=(p_payload->>'billId')::uuid FOR UPDATE;
   IF NOT FOUND OR bill.buyer_id<>p_buyer::text THEN RAISE EXCEPTION 'Bill not found'; END IF;
   IF bill.status<>'sent' OR (bill.valid_until IS NOT NULL AND bill.valid_until<now()) THEN RAISE EXCEPTION 'Bill is no longer payable'; END IF;
   service_id:=bill.service_listing_id; amount:=bill.total_amount;
  ELSE
   service_id:=(p_payload->>'serviceId')::uuid;
  END IF;
  IF service_id IS NOT NULL THEN
   SELECT * INTO listing FROM service_listings WHERE id=service_id FOR SHARE;
   IF NOT FOUND OR NOT listing.is_active THEN RAISE EXCEPTION 'Service unavailable'; END IF;
   IF bill.id IS NOT NULL AND listing.merchant_id::text<>bill.merchant_id THEN RAISE EXCEPTION 'Service merchant mismatch'; END IF;
   amount:=COALESCE(amount,listing.base_price);
   IF amount IS NULL OR amount<0 THEN RAISE EXCEPTION 'Invalid service price'; END IF;
   INSERT INTO service_bookings(service_id,buyer_id,merchant_id,status,scheduled_at,service_address,buyer_note,quoted_price,payment_status,escrow_status,is_test)
   VALUES(service_id,p_buyer,listing.merchant_id,'requested',NULLIF(p_payload->>'scheduledAt','')::timestamptz,p_payload->>'address',left(p_payload->>'note',1000),amount,'paid','held',true) RETURNING * INTO booking;
  ELSIF bill.id IS NULL THEN RAISE EXCEPTION 'Service required';
  END IF;
  IF bill.id IS NOT NULL THEN UPDATE service_bills SET status='paid',booking_id=booking.id,is_test=true WHERE id=bill.id; END IF;
  result:=jsonb_build_object('success',true,'isTest',true,'data',jsonb_build_object('id',COALESCE(booking.id,bill.id),'orderId',COALESCE(booking.id,bill.id),'amount',amount),'bookingId',booking.id);
 END IF;
 INSERT INTO pilot_attempts VALUES(p_buyer,p_key,md5(p_payload::text),result,now());
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION pilot_service_checkout(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pilot_service_checkout(uuid,text,jsonb) TO service_role;
