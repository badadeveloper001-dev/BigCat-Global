-- Phase E-1: Merchant business verification foundation
-- Forward-only migration. No UI, upload, or verification workflow changes.
--
-- Existing merchant identity/compliance fields on auth_users remain untouched.
-- This table provides a dedicated lifecycle for business registration documents.

BEGIN;

CREATE TABLE IF NOT EXISTS public.merchant_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE REFERENCES public.auth_users(id) ON DELETE CASCADE,

  country TEXT NOT NULL
    CHECK (country IN ('NG', 'CN')),

  registration_number TEXT NOT NULL,

  document_type TEXT NOT NULL
    CHECK (document_type IN ('cac_certificate', 'business_license')),

  document_url TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'verified', 'rejected')),

  rejection_reason TEXT,

  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT merchant_verifications_country_document_type_check
    CHECK (
      (country = 'NG' AND document_type = 'cac_certificate')
      OR
      (country = 'CN' AND document_type = 'business_license')
    ),

  CONSTRAINT merchant_verifications_review_consistency_check
    CHECK (
      (status = 'rejected' AND rejection_reason IS NOT NULL)
      OR
      (status <> 'rejected')
    )
);

CREATE INDEX IF NOT EXISTS idx_merchant_verifications_country
  ON public.merchant_verifications(country);

CREATE INDEX IF NOT EXISTS idx_merchant_verifications_status
  ON public.merchant_verifications(status);

CREATE INDEX IF NOT EXISTS idx_merchant_verifications_reviewed_by
  ON public.merchant_verifications(reviewed_by);

ALTER TABLE public.merchant_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_verifications_select_own
  ON public.merchant_verifications;

CREATE POLICY merchant_verifications_select_own
  ON public.merchant_verifications
  FOR SELECT
  USING (merchant_id = auth.uid()::UUID);

COMMIT;
