-- BigCat: pending listing-currency and feedback additions only.
-- Run in the existing Supabase project SQL Editor.
BEGIN;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS listing_currency text NOT NULL DEFAULT 'NGN' CHECK (listing_currency IN ('NGN','CNY','USD'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS listing_price numeric(16,2) CHECK (listing_price > 0);
-- Existing price/cost_price stay NGN. NULL listing_price means use legacy NGN price.

CREATE TABLE IF NOT EXISTS public.pilot_feedback (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 category text NOT NULL CHECK (category IN ('bug','confusion','suggestion')),
 description text NOT NULL CHECK (length(description) BETWEEN 1 AND 5000),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pilot_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilot_feedback FROM anon, authenticated;
GRANT ALL ON public.pilot_feedback TO service_role;

COMMIT;
