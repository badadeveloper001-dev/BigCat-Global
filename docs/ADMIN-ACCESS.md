# Admin access setup

Admins enter only their designated access code at /admin-portal. No email signup, Supabase account, or database role assignment is needed. The server maps ADMIN_BIGCAT_ACCESS_CODE to BigCat, ADMIN_ORCHID_ACCESS_CODE to Orchid, and ADMIN_LOGISTICS_ACCESS_CODE to Trade & Logistics.

Set these server-only Vercel variables to distinct random values of at least 16 characters. Keep ADMIN_SESSION_SECRET at least 32 random characters. Keep UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN configured; login fails closed without distributed IP rate limiting (5 attempts per 10 minutes). Never prefix these variables with NEXT_PUBLIC.

The server issues a signed, HttpOnly, one-hour session cookie. Changing a dashboard code invalidates its existing sessions; changing ADMIN_SESSION_SECRET invalidates all sessions. DELETE /api/admin/session signs out. Codes identify dashboard access, not individual people; people sharing a code share that identity.

BigCat retains platform oversight. Orchid is restricted to payment operations and Trade & Logistics to logistics. Backend actions and dashboard layouts verify the signed session and scope. Payments remain simulated. The previous 033-assign-admin-account.sql is not required for code-only access.
