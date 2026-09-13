BEGIN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS minimum_order_quantity integer NOT NULL DEFAULT 1 CHECK (minimum_order_quantity BETWEEN 1 AND 99999999);
COMMIT;
