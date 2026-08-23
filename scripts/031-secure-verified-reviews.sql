-- Secure verified product reviews and keep product aggregates accurate.
-- Apply after create-reviews-table.sql. This migration intentionally fails if
-- duplicate buyer/product reviews already exist so they can be reviewed rather
-- than silently deleting customer content.

ALTER TABLE reviews
  ALTER COLUMN comment SET NOT NULL,
  ALTER COLUMN verified_purchase SET DEFAULT true,
  ALTER COLUMN verified_purchase SET NOT NULL;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_comment_length_check;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_comment_length_check
  CHECK (char_length(btrim(comment)) BETWEEN 10 AND 1000);

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_verified_order_check;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_verified_order_check
  CHECK (verified_purchase = true AND order_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_buyer_product_idx
  ON reviews(product_id, user_id);
CREATE INDEX IF NOT EXISTS reviews_order_id_idx ON reviews(order_id);

CREATE OR REPLACE FUNCTION set_review_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_set_updated_at ON reviews;
CREATE TRIGGER reviews_set_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION set_review_updated_at();

CREATE OR REPLACE FUNCTION refresh_product_review_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_product_id uuid;
BEGIN
  affected_product_id := COALESCE(NEW.product_id, OLD.product_id);

  UPDATE products
  SET
    average_rating = COALESCE(
      (SELECT round(avg(rating)::numeric, 2) FROM reviews WHERE product_id = affected_product_id),
      0
    ),
    review_count = (SELECT count(*) FROM reviews WHERE product_id = affected_product_id)
  WHERE id = affected_product_id;

  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    UPDATE products
    SET
      average_rating = COALESCE(
        (SELECT round(avg(rating)::numeric, 2) FROM reviews WHERE product_id = OLD.product_id),
        0
      ),
      review_count = (SELECT count(*) FROM reviews WHERE product_id = OLD.product_id)
    WHERE id = OLD.product_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_refresh_product_summary ON reviews;
CREATE TRIGGER reviews_refresh_product_summary
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_product_review_summary();

UPDATE products p
SET
  average_rating = COALESCE(
    (SELECT round(avg(r.rating)::numeric, 2) FROM reviews r WHERE r.product_id = p.id),
    0
  ),
  review_count = (SELECT count(*) FROM reviews r WHERE r.product_id = p.id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read reviews" ON reviews;
CREATE POLICY "Public can read reviews"
  ON reviews FOR SELECT
  USING (true);

-- Writes go through server actions using the service role after session,
-- delivered-order, ownership, and duplicate checks. Browser clients get no
-- direct INSERT/UPDATE/DELETE policy.
REVOKE INSERT, UPDATE, DELETE ON reviews FROM anon, authenticated;
GRANT SELECT ON reviews TO anon, authenticated;
