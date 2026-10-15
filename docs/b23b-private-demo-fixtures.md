# B2.3B — Private demo merchant fixture (implementation contract)

Status: preparation only; no production data changes.

## Authorized test buyer
- Email supplied by pilot lead: badaadewunmi04@gmail.com
- Resolve this email to the authenticated buyer UUID on the server. Never trust a buyer email or UUID supplied in a request.
- Fail closed if the email does not resolve to exactly one eligible buyer.

## Synthetic fixtures
- Three deterministic merchant UUIDs and products (Electronics/CN, Fashion/NG, Home/CN).
- Use dedicated marker table with merchant UUID, fixture batch ID and created_at. Do not rely on merchant names to identify demo data.
- Fixture merchants use no login password, Google ID, phone, bank account, CAC, or verification claim.
- Products are marked through a dedicated fixture-product table; preserve existing production product schema.
- Seed and cleanup must be idempotent, transactional and scoped to the fixture batch. Never delete unrelated orders, real merchants, or real products.

## Mandatory isolation
- Existing lib/supabase/server.ts uses a service-role key; therefore RLS alone will NOT protect demo visibility.
- Filter all public product listing paths (including getAllProducts, product detail actions, APIs and search), resolving server-side authenticated user UUID; only the designated buyer sees demo products.
- Reject unauthorized demo product IDs in checkout and direct API paths, including app/api/checkout/initiate/route.ts.
- For the designated buyer, allow demo items to reach the B2.3A multi-merchant safety gate, so a mixed cart can be rejected before writes.
- Block actual Orchid/payment initiation, wallet debits, escrow and merchant settlement for demo items. Test-only checkout may be restricted to rejection validation.
- Never assume the unpublished site is inaccessible; protect APIs and server actions.

## Review checklist before any production seed
1. Inspect current auth_users, products and merchant_profiles FK constraints and required columns in deployed Supabase schema; historical SQL scripts conflict.
2. Inspect every product-detail/search route and checkout side-effect path.
3. Implement migration, seed, access checks, payment guard and targeted tests in this branch.
4. Review code and deployment requirements; obtain explicit approval before merging or executing seed.
5. Validate only via approved main-to-production Vercel deployment, not Preview.
