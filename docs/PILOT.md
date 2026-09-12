# China / Nigeria web pilot

This branch is for simulated transactions. Goods use a test wallet or simulated payment; services use simulated payment without a wallet debit. No payment provider is connected. Do not collect real funds or dispatch real shipments.

## Architecture

Next.js App Router serves the React web application, route handlers and server actions. Supabase Auth verifies sessions; PostgreSQL stores profiles, catalog, conversations and transactions. Server-only modules hold the Supabase service key. The database functions in migrations 030–033 own stock, test debits, coupon usage, refunds and finalization. Browser IDs and prices are not authority.

Vercel Blob stores uploaded product images under the uploader's ID. Email and optional WhatsApp deliver notifications. Chat translation is optional: failures and a 2.5-second timeout retain original messages. English and Simplified Chinese checkout use fixed test rates: USD 1 = NGN 1,600 = CNY 7.20. Product accounting is NGN.

## Prepare the isolated environment

1. Create a separate Supabase pilot project. Use its public URL and anon key as NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Set SUPABASE_SERVICE_ROLE_KEY on the server only.
2. Set PAYMENT_MODE=test. Set DATABASE_URL to the PostgreSQL connection string, including the database password. An API key is not a database password.
3. With Node 22 and pnpm 11.19.0, run pnpm install --frozen-lockfile, pnpm migrate, pnpm typecheck, pnpm test and pnpm build. The runner records checksums and stops at the first failed migration. It rejects legacy text-ID databases. Do not run the old Aurora setup scripts or setup-db command.
4. Configure the pilot domain and Supabase authentication redirect allowlist, including /auth/callback. Configure email delivery and BLOB_READ_WRITE_TOKEN. OPENAI_API_KEY is optional for translation; configure Upstash for shared OTP throttling.
5. Create buyer and merchant accounts through signup. Provision the pilot operator's admin role directly in the isolated database after verifying that account. Never expose an admin code or role selector in signup.
6. Require a successful deployment and hosted smoke test before inviting testers. No live database or hosting credentials were used during local implementation.

Use BIGCAT_BUILD_WORKER_THREADS=1 when building in an environment that supports Node worker threads but cannot spawn subprocesses. This does not skip type checking.

## Tester scenarios / 测试场景

- Sign up and sign back in from Nigeria and mainland China using email. Select country and language; check city/province and +234/+86 phone entry. Chinese testers should verify email delivery independently of Google sign-in.
- Create a product, upload an image, open it as a buyer, and exchange English/Chinese chat messages. Disable translation and confirm original messages remain usable.
- Add products from one merchant. Change currency, check the explicit test notice and server quote. Run success, declined and cancelled payment scenarios. Confirm failures create no order, debit or stock reservation.
- Fund the test wallet. Submit with insufficient funds, then with sufficient funds. Retry after a dropped response and confirm there is only one debit/order. Confirm the displayed order currency and fixed rate.
- Merchant: receive, pack and dispatch a goods order. Operator: mark simulated transit/completion. Buyer: confirm receipt. For pickup, buyer confirms after packing. Confirm one merchant test credit with no platform fee included.
- Cancel an eligible order twice. Confirm stock and the original test currency balance are restored once. A dispatched order or open dispute must prevent ordinary cancellation.
- Submit a service booking or sent service bill. Retry the same submission. Check one booking/payment receipt, its server price, and the simulated-payment notice.
- Try another account's wallet, messages, orders, profile and uploads. These must fail; a buyer must not reach admin mutations.

Record browser, country/network, language, steps, expected result, actual result and order/request ID. Use sample addresses and catalog data. Merchant pilot signup does not need government or bank IDs.

## Release limits

Goods checkout currently supports one merchant per transaction. Services simulate payment and do not debit the test wallet. Pickup confirmation is performed by the buyer; the older rider-token payment endpoint is retired. Merchant token charging is paused. Email changes and withdrawals are paused. Some dashboard copy remains English; checkout and key signup fields have Chinese support.

Mainland-China reachability, email delivery, CDN/image access, real network latency and hosting account health require checks from the deployed pilot. Local database tests cannot establish those results. Adding a real payment API requires a separate provider integration and verified webhook flow; changing PAYMENT_MODE does not enable real payments.
