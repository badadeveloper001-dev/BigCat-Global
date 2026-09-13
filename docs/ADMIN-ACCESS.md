# Admin access setup

Sign in with a Supabase account whose auth_users role is admin (BigCat), orchid_admin (payment operations), or trade_logistics_admin (logistics). Roles must be assigned by a trusted database operator, never public signup. Suspended accounts are denied.

Set server-only Vercel environment variables ADMIN_BIGCAT_ACCESS_CODE, ADMIN_ORCHID_ACCESS_CODE, ADMIN_LOGISTICS_ACCESS_CODE to distinct randomly generated values of at least 16 characters. Set ADMIN_SESSION_SECRET to a random value of at least 32 characters. Do not use NEXT_PUBLIC prefixes or the former public demo codes. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN; code verification fails closed without distributed rate limiting.

The access code is a second step after account login, not a replacement for identity. Sessions expire after one hour and are bound to the account, role and dashboard. DELETE /api/admin/session signs out the admin session. Rotating ADMIN_SESSION_SECRET invalidates all admin sessions.

BigCat has platform oversight. Orchid can read transaction operations, not manage users or merchant approvals. Trade & Logistics can operate logistics, not payments or user administration. Payments remain simulated. No provider custody or automatic refund capability is implied.

SMEDAN dashboard removed; existing merchant registration identifiers are retained. These changes require deployment and server environment configuration before use.
