BEGIN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS listing_currency text NOT NULL DEFAULT 'NGN' CHECK (listing_currency IN ('NGN','CNY','USD'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS listing_price numeric(16,2) CHECK (listing_price > 0);
-- Existing price/cost_price stay NGN. NULL listing_price means use legacy NGN price.
COMMIT;
