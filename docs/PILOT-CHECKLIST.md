# Existing-product pilot checklist

Scope: Nigeria and China web testers, existing main database (test data only), simulated transactions until a payment provider is integrated. Preserve existing typography, layouts, checkout, and features. Changes must fix a specific reproducible gap. Code presence is not proof of working hosted behavior.

| Area | Existing implementation / next acceptance check | Status |
| --- | --- | --- |
| Authentication and onboarding | Buyer/merchant forms, Supabase login, OAuth and OTP code exist. Buyers share one marketplace with no country role. Signup accepts a state/province/region. Existing preferences use detected country (CN: Chinese; NG: English), browser fallback and saved overrides. Runtime signup role validation patched locally. Verify email ownership, profile completion and account recovery end to end. No recovery implementation found in initial scan. | In progress |
| Seller/products | Merchant setup, product management, image upload and storefront components exist. Verify create/edit, price, stock, MOQ and ownership. | Needs verification |
| Discovery | Marketplace, product and vendor pages exist. Verify search/category/filter combinations against real test catalog. | Needs verification |
| Messaging/anti-bypass | Conversation and translation actions exist. Verify participants, delivery/retries, and persistent off-platform attempt reports visible to admin. | Needs verification |
| Order journey | Existing cart, checkout, orders and logistics exist. Exercise every allowed transition and retries without replacing checkout. | Needs verification |
| Payment protection | Existing wallet/escrow code needs review. Define simulated payment states; never represent these as actual regulated custody. Real payments remain out of pilot scope. | Open |
| Currency | Existing global preferences and currency helpers exist. Check every product, cart, fee, total, refund and wallet amount for explicit currency and consistent rates. | Needs verification |
| Logistics | Existing tracking and admin logistics components exist. Verify shipping details, manual updates and buyer confirmation. | Needs verification |
| Disputes/refunds | Support issue and escrow actions exist. Verify participant access, admin intervention, original amount and one-time refund. | Needs verification |
| Admin | Existing dashboards exist. Verify server-side authorization and users/products/orders/payments/disputes/reports/audit coverage. | Needs verification |
| Notifications | Notification module/panel exists. Check each requested lifecycle event and delivery failures. | Needs verification |
| Analytics/errors | Sentry and Vercel Analytics dependencies/config exist. Confirm deployed configuration and checkout abandonment/error events without sensitive payloads. | Needs verification |
| Feedback | Order issue reporting exists. Check general bug/confusion/suggestion submission and admin triage. | Open |
| Legal/pilot docs | Terms and Privacy routes exist. Review accuracy and add pilot consent/transaction/refund rules appropriate to simulated payments. | Open |
| Security | Audit server actions, database grants/RLS, uploads, webhooks, rate limits and client bundles. Runtime signup role validation patched locally. | In progress |

## Release evidence required

Use buyer, seller and admin test accounts. Record expected/actual results for signup/recovery, product management, messaging, checkout success/failure/retry, shipping, delivery, dispute/refund and feedback. Verify reachability and email/image delivery from actual Nigeria and mainland China networks. Database migrations were not applied during the reverted overhaul. Do not reapply that overhaul wholesale.

## End of first implementation pass

All 15 areas have received an initial pass, not release acceptance. Changes remain local and undeployed. Preserve the existing design and checkout.

Required follow-ups with the owner: pending database migrations (product listing currency and feedback), MOQ, and admin dashboard scope.

Outstanding release blockers include account recovery/email verification, atomic checkout/wallet/refunds and durable retry handling, gateway-ready currency quotes, dispute resolution decisions, feedback admin triage, durable consent records, complete service-action authorization, actual Supabase grants/RLS, rate limiting, and hosted end-to-end tests from Nigeria/China. The sampled secret-variable search is not a credential/history audit.

Latest security fixes: account mutation identity checks; profile update field allowlist; upload authentication and ownership-scoped deletion. Mocked upload/deletion denial checks passed. No Supabase policies or data were modified.

## Consolidated pilot deployment

Owner confirmed listing currency, feedback and MOQ migrations completed successfully. MOQ and scoped backend admin access are implemented. Admin secrets and Upstash settings still require hosted configuration verification. Publishing this implementation batch does not close the outstanding release acceptance checks above.
