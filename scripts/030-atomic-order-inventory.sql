-- Atomic order creation and stock reservation for one merchant order.
-- Apply after the canonical order/product migrations.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS merchant_id UUID,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applied_coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_total NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS pickup_token TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_merchant_id
  ON public.orders (merchant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON public.orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_marketplace_order_atomic(
  p_order_id UUID,
  p_buyer_id UUID,
  p_merchant_id UUID,
  p_delivery_type TEXT,
  p_delivery_address TEXT,
  p_payment_method TEXT,
  p_delivery_fee NUMERIC,
  p_promotion_id UUID,
  p_promotion_discount NUMERIC,
  p_coupon_id UUID,
  p_coupon_code TEXT,
  p_coupon_discount NUMERIC,
  p_pickup_token TEXT,
  p_idempotency_key TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  product_row RECORD;
  existing_order RECORD;
  product_total NUMERIC := 0;
  safe_promotion_discount NUMERIC := GREATEST(COALESCE(p_promotion_discount, 0), 0);
  safe_coupon_discount NUMERIC := GREATEST(COALESCE(p_coupon_discount, 0), 0);
  safe_delivery_fee NUMERIC := GREATEST(COALESCE(p_delivery_fee, 0), 0);
  git_fee NUMERIC := 0;
  grand_total NUMERIC := 0;
  affected_rows INTEGER := 0;
BEGIN
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 12 THEN
    RAISE EXCEPTION 'A valid idempotency key is required';
  END IF;

  SELECT id, grand_total, product_total
    INTO existing_order
    FROM public.orders
   WHERE idempotency_key = p_idempotency_key
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', existing_order.id,
      'grandTotal', existing_order.grand_total,
      'productTotal', existing_order.product_total,
      'idempotentReplay', true
    );
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  -- Lock every product before validating or calculating totals.
  PERFORM id
    FROM public.products
   WHERE id IN (
     SELECT (value->>'productId')::UUID
       FROM jsonb_array_elements(p_items)
   )
   ORDER BY id
   FOR UPDATE;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE((item->>'quantity')::INTEGER, 0) <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero';
    END IF;

    SELECT id, merchant_id, name, price, stock, is_active
      INTO product_row
      FROM public.products
     WHERE id = (item->>'productId')::UUID;

    IF NOT FOUND OR product_row.merchant_id <> p_merchant_id THEN
      RAISE EXCEPTION 'Product is unavailable or belongs to another merchant';
    END IF;

    IF product_row.is_active IS FALSE THEN
      RAISE EXCEPTION '% is not currently available', product_row.name;
    END IF;

    IF COALESCE(product_row.stock, 0) < (item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for %', product_row.name;
    END IF;

    product_total := product_total + (product_row.price * (item->>'quantity')::INTEGER);
  END LOOP;

  safe_promotion_discount := LEAST(safe_promotion_discount, product_total);
  git_fee := ROUND(GREATEST(product_total - safe_promotion_discount, 0) * 0.015, 2);
  safe_coupon_discount := LEAST(
    safe_coupon_discount,
    GREATEST(product_total - safe_promotion_discount + safe_delivery_fee + git_fee, 0)
  );
  grand_total := GREATEST(
    product_total - safe_promotion_discount + safe_delivery_fee + git_fee - safe_coupon_discount,
    0
  );

  IF p_promotion_id IS NOT NULL AND safe_promotion_discount > 0 THEN
    UPDATE public.promotions
       SET current_uses = COALESCE(current_uses, 0) + 1,
           updated_at = now()
     WHERE id = p_promotion_id
       AND merchant_id = p_merchant_id
       AND is_active = true
       AND now() BETWEEN start_date AND end_date
       AND (max_uses IS NULL OR current_uses < max_uses);

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
      RAISE EXCEPTION 'Selected promotion is no longer available';
    END IF;
  END IF;

  IF p_coupon_id IS NOT NULL AND safe_coupon_discount > 0 THEN
    UPDATE public.coupons
       SET current_uses = COALESCE(current_uses, 0) + 1
     WHERE id = p_coupon_id
       AND merchant_id = p_merchant_id
       AND upper(code) = upper(p_coupon_code)
       AND is_active = true
       AND now() BETWEEN start_date AND end_date
       AND (max_uses IS NULL OR current_uses < max_uses);

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
      RAISE EXCEPTION 'Selected coupon is no longer available';
    END IF;

    INSERT INTO public.coupon_usage (coupon_id, buyer_id, used_count, last_used_at)
    VALUES (p_coupon_id, p_buyer_id, 1, now())
    ON CONFLICT (coupon_id, buyer_id)
    DO UPDATE SET
      used_count = public.coupon_usage.used_count + 1,
      last_used_at = now();
  END IF;

  INSERT INTO public.orders (
    id, buyer_id, merchant_id, status, payment_status,
    grand_total, product_total, delivery_fee, delivery_type,
    delivery_address, payment_method, applied_coupon_code,
    coupon_discount, final_total, total_amount, pickup_token, idempotency_key
  )
  VALUES (
    p_order_id, p_buyer_id, p_merchant_id, 'pending', 'completed',
    grand_total, product_total, safe_delivery_fee, p_delivery_type,
    p_delivery_address, p_payment_method, p_coupon_code,
    safe_coupon_discount, grand_total, grand_total, p_pickup_token, p_idempotency_key
  );

  FOR item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, price, stock
      INTO product_row
      FROM public.products
     WHERE id = (item->>'productId')::UUID;

    INSERT INTO public.order_items (
      id, order_id, product_id, merchant_id, product_name,
      quantity, unit_price, total_price, weight
    )
    VALUES (
      gen_random_uuid(), p_order_id, product_row.id, p_merchant_id,
      product_row.name, (item->>'quantity')::INTEGER, product_row.price,
      product_row.price * (item->>'quantity')::INTEGER,
      COALESCE((item->>'weight')::NUMERIC, 0.5)
    );

    UPDATE public.products
       SET stock = stock - (item->>'quantity')::INTEGER,
           updated_at = now()
     WHERE id = product_row.id;
  END LOOP;

  RETURN jsonb_build_object(
    'id', p_order_id,
    'grandTotal', grand_total,
    'productTotal', product_total,
    'promotionDiscount', safe_promotion_discount,
    'couponDiscount', safe_coupon_discount,
    'deliveryFee', safe_delivery_fee,
    'gitFee', git_fee,
    'idempotentReplay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_marketplace_order_atomic(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, UUID, NUMERIC,
  UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_marketplace_order_atomic(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, UUID, NUMERIC,
  UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB
) TO service_role;
