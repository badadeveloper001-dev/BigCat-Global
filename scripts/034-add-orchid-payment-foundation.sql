-- Phase A: Orchid Payment Foundation
-- Forward-only migration. DO NOT apply to production without review.
-- Adds minimal columns for Orchid pilot payment lifecycle.

BEGIN;

-- Orders: payment reference, provider, and confirmation timestamps
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz;

-- Partial unique index: prevent duplicate non-null payment references
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference_unique
  ON public.orders (payment_reference)
  WHERE payment_reference IS NOT NULL;

-- Auth users: Orchid onboarding/approval lifecycle
ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS orchid_status text NOT NULL DEFAULT 'not_started';

-- Narrow CHECK constraint on orchid_status
ALTER TABLE public.auth_users
  ADD CONSTRAINT auth_users_orchid_status_check
  CHECK (orchid_status IN ('not_started', 'pending', 'approved', 'rejected'));

COMMIT;
