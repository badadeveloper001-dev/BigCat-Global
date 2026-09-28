-- Phase E-3: Private merchant verification document storage
-- Forward-only migration. Creates a private Supabase Storage bucket.
-- Documents are uploaded through the authenticated server endpoint only.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchant-verification-documents',
  'merchant-verification-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

COMMIT;
