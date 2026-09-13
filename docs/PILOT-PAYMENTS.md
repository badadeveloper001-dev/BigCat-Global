# Pilot payment rules

This pilot uses test data and simulated transactions only. Card and bank selections do not initiate real provider payments. Wallet balances are test credits. Do not collect real money or describe internal ledger records as regulated escrow custody.

Existing application states are retained for compatibility: a successful simulation is recorded as paid/payment completed, followed by seller receipt, packing, dispatch, logistics completion and buyer confirmation. These labels are test workflow states, not evidence of external settlement. A failed request must not be treated as proof that no write occurred; inspect the order before manually retrying.

Outstanding before tester invitations: verify atomic order/wallet updates, durable retry protection, server-side prices and coupon totals, failed/cancelled simulations, and one-time refunds/settlement. The current process-local retry cache is not durable protection across deployments. Review all alternate payment routes and service payments.

The legacy webhook now rejects callbacks when no signing secret is configured. This does not certify its signature format or settlement logic for any provider. Real payments require a separate provider integration, verified event/amount/currency/order binding, persistent event deduplication and the provider's supported holding/refund arrangement.
