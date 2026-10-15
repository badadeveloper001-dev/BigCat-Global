-- B2.1: merchant settlement account storage. Apply after review; no payment activation.
BEGIN;
CREATE TABLE IF NOT EXISTS public.merchant_payment_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 merchant_id uuid NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
 country_code text NOT NULL CHECK (country_code IN ('NG','CN')),
 currency_code text NOT NULL,
 institution_name text NOT NULL,
 account_holder_name text NOT NULL,
 account_number text NOT NULL,
 branch_name text,
 routing_code_type text CHECK (routing_code_type IN ('SWIFT','CNAPS')),
 routing_code text,
 is_default boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT merchant_payment_accounts_country_currency CHECK ((country_code='NG' AND currency_code='NGN') OR (country_code='CN' AND currency_code='CNY')),
 CONSTRAINT merchant_payment_accounts_ng_format CHECK (country_code<>'NG' OR account_number ~ '^[0-9]{10}$'),
 CONSTRAINT merchant_payment_accounts_cn_format CHECK (country_code<>'CN' OR account_number ~ '^[0-9]{8,34}$'),
 CONSTRAINT merchant_payment_accounts_routing_pair CHECK ((routing_code_type IS NULL AND routing_code IS NULL) OR (routing_code_type IS NOT NULL AND routing_code IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_merchant_payment_accounts_merchant ON public.merchant_payment_accounts(merchant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_payment_accounts_default ON public.merchant_payment_accounts(merchant_id) WHERE is_default;
ALTER TABLE public.merchant_payment_accounts ENABLE ROW LEVEL SECURITY;
-- Only service-role API can access sensitive bank details. No anon/authenticated policies.
COMMIT;
