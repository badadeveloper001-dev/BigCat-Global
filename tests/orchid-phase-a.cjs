/**
 * Phase A: Orchid Payment Foundation — Targeted Tests (no external dependencies)
 * Verifies order creation, payment references, security hardening, and pilot visibility.
 * Run: node tests/orchid-phase-a.cjs
 */
const fs = require('fs')
const assert = require('node:assert/strict')

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function main() {
  let passed = 0
  let failed = 0

  function test(name, fn) {
    try {
      fn()
      passed++
      console.log(`  PASS: ${name}`)
    } catch (e) {
      failed++
      console.error(`  FAIL: ${name}`)
      console.error(`        ${e.message}`)
    }
  }

  console.log('\n=== Phase A: Orchid Payment Foundation Tests ===\n')

  // ── Load sources ──────────────────────────────────────────────────────────

  const orderSource = read('lib/order-actions.ts')
  const checkoutSource = read('components/checkout-page.tsx')
  const selectorSource = read('components/payment-method-selector.tsx')
  const migrationSource = read('scripts/034-add-orchid-payment-foundation.sql')

  const buyerFundSource = read('app/api/buyer/wallet/fund/route.ts')
  const buyerDebitSource = read('app/api/buyer/wallet/debit/route.ts')
  const walletGetSource = read('app/api/wallet/route.ts')
  const buyerWalletGetSource = read('app/api/buyer/wallet/route.ts')
  const merchantWalletGetSource = read('app/api/merchant/wallet/route.ts')
  const checkoutInitSource = read('app/api/checkout/initiate/route.ts')
  const walletFundSource = read('app/api/wallet/fund/route.ts')
  const walletPaySource = read('app/api/wallet/pay/route.ts')
  const walletConvertSource = read('app/api/wallet/convert/route.ts')

  // ── 1. Payment reference generation ──────────────────────────────────────

  console.log('Payment Reference Generation:')

  test('generatePaymentReference exists as a private helper in the server module', () => {
    assert.ok(orderSource.includes('function generatePaymentReference(): string'), 'Function declaration must exist')
    assert.ok(!/export\s+function\s+generatePaymentReference/.test(orderSource), 'Must not be exported from the use server module')
    assert.ok(orderSource.includes("'use server'"), 'Must be declared in a server module')
    assert.ok(
      orderSource.includes('isOrchidPayment ? generatePaymentReference()'),
      'Must be generated server-side during order creation, never accepted from the client'
    )
  })

  test('generatePaymentReference returns BCG-ORC-XXXXXXXX format', () => {
    // Verify the format string is used in the implementation (template literal uses backticks)
    assert.ok(orderSource.includes('BCG-ORC-'), 'Must use BCG-ORC- prefix')
    assert.ok(orderSource.includes("crypto.randomUUID()"), 'Must use crypto.randomUUID for randomness')
    assert.ok(orderSource.includes(".replace(/-/g, '').slice(0, 8).toUpperCase()"), 'Must take 8 hex chars uppercased')
  })

  test('generatePaymentReference is not timestamp-only', () => {
    // Verify it uses crypto.randomUUID, not Date.now
    assert.ok(!orderSource.includes("generatePaymentReference") || orderSource.includes("crypto.randomUUID()"),
      'Must use crypto.randomUUID, not Date.now')
    // The old checkout/initiate route used PM-Date.now() — verify it is NOT used here
    assert.ok(!orderSource.includes("'PM-' + Date.now()"),
      'Must not use Date.now() for payment reference generation')
  })

  // ── 2. Orchid order creation behavior ────────────────────────────────────

  console.log('\nOrchid Order Creation Behavior:')

  test('createOrder sets status=pending for Orchid (not paid)', () => {
    assert.ok(
      orderSource.includes("baseOrderInsert.status = 'pending'") && orderSource.includes("isOrchidPayment"),
      'Orchid orders must be created with status=pending'
    )
  })

  test('createOrder sets payment_status=pending for Orchid (not completed)', () => {
    assert.ok(
      orderSource.includes("baseOrderInsert.payment_status = 'pending'") && orderSource.includes("isOrchidPayment"),
      'Orchid orders must have payment_status=pending'
    )
  })

  test('createOrder sets payment_provider=orchid', () => {
    assert.ok(
      orderSource.includes("baseOrderInsert.payment_provider = 'orchid'"),
      'Orchid orders must set payment_provider=orchid'
    )
  })

  test('createOrder generates payment_reference for Orchid orders', () => {
    assert.ok(
      orderSource.includes("baseOrderInsert.payment_reference = paymentReference") && orderSource.includes("isOrchidPayment ? generatePaymentReference()"),
      'Orchid orders must receive a server-generated payment_reference'
    )
  })

  test('createOrder sets escrow_status=pending (not held) for Orchid', () => {
    assert.ok(
      orderSource.includes("baseOrderInsert.escrow_status = 'pending'") && orderSource.includes("isOrchidPayment"),
      'Orchid orders must explicitly set escrow_status=pending to avoid the held default'
    )
  })

  test('createOrder skips holdFundsInEscrow for Orchid orders', () => {
    assert.ok(
      orderSource.includes('if (!isOrchidPayment)') && orderSource.includes('holdFundsInEscrow'),
      'holdFundsInEscrow must be skipped when isOrchidPayment is true'
    )
  })

  test('payment_submitted_at is NOT set at creation (starts NULL)', () => {
    // Verify payment_submitted_at is not referenced in baseOrderInsert
    const baseOrderSection = orderSource.substring(
      orderSource.indexOf('const baseOrderInsert'),
      orderSource.indexOf('orderInsertAttempts')
    )
    assert.ok(!baseOrderSection.includes('payment_submitted_at'),
      'payment_submitted_at must not be set during order creation')
  })

  test('payment_confirmed_at is NOT set at creation (starts NULL)', () => {
    const baseOrderSection = orderSource.substring(
      orderSource.indexOf('const baseOrderInsert'),
      orderSource.indexOf('orderInsertAttempts')
    )
    assert.ok(!baseOrderSection.includes('payment_confirmed_at'),
      'payment_confirmed_at must not be set during order creation')
  })

  test('Non-Orchid orders still use status=paid (backward compatible)', () => {
    assert.ok(
      orderSource.includes("baseOrderInsert.status = 'paid'") && orderSource.includes("} else {"),
      'Non-Orchid path must preserve legacy paid status'
    )
  })

  // ── 3. Checkout page Orchid flow ─────────────────────────────────────────

  console.log('\nCheckout Page Orchid Flow:')

  test('Checkout page has orchidPaymentReference state', () => {
    assert.ok(
      checkoutSource.includes('orchidPaymentReference') && checkoutSource.includes('useState<string | null>(null)'),
      'Checkout must have orchidPaymentReference state'
    )
  })

  test('Checkout page shows payment reference after Orchid order creation', () => {
    assert.ok(
      checkoutSource.includes("result.data?.paymentReference") && checkoutSource.includes('setOrchidPaymentReference'),
      'Checkout must display the Orchid payment reference after order creation'
    )
  })

  test('Checkout page skips wallet payment for Orchid method', () => {
    assert.ok(
      checkoutSource.includes("paymentMethod !== 'orchid'") && checkoutSource.includes('finalizeWalletPayment'),
      'Wallet payment must be skipped when paymentMethod is orchid'
    )
  })

  test('Checkout submit button says "Create Order & Get Reference" for Orchid', () => {
    assert.ok(
      checkoutSource.includes('Create Order & Get Reference'),
      'Submit button must show Orchid-specific text'
    )
  })

  // ── 4. Payment method selector — Orchid only ─────────────────────────────

  console.log('\nPilot Payment Visibility:')

  test('Payment method selector shows Orchid as active', () => {
    assert.ok(
      selectorSource.includes("id: 'orchid' as PaymentMethod"),
      'Orchid must be the active payment method'
    )
  })

  test('Bank Transfer is commented out for pilot', () => {
    // Comments may have indentation (//   id: 'bank')
    assert.ok(
      /\/\/\s+id:\s+'bank'\s+as\s+PaymentMethod/.test(selectorSource),
      'Bank Transfer must be commented out for pilot'
    )
  })

  test('Card is commented out for pilot', () => {
    assert.ok(
      /\/\/\s+id:\s+'card'\s+as\s+PaymentMethod/.test(selectorSource),
      'Card must be commented out for pilot'
    )
  })

  // ── 5. Security hardening ────────────────────────────────────────────────

  console.log('\nSecurity Hardening:')

  test('BUYER WALLET FUND: requires authentication', () => {
    assert.ok(buyerFundSource.includes('requireAuthenticatedUser'))
  })
  test('BUYER WALLET FUND: enforces ownership', () => {
    assert.ok(buyerFundSource.includes('auth.user.id !== buyerId'))
  })
  test('BUYER WALLET FUND: handles missing transactions table', () => {
    assert.ok(buyerFundSource.includes('Wallet ledger is not available'))
  })

  test('BUYER WALLET DEBIT: requires authentication', () => {
    assert.ok(buyerDebitSource.includes('requireAuthenticatedUser'))
  })
  test('BUYER WALLET DEBIT: enforces ownership', () => {
    assert.ok(buyerDebitSource.includes('auth.user.id !== buyerId'))
  })

  test('WALLET GET: requires authentication', () => {
    assert.ok(walletGetSource.includes('requireAuthenticatedUser'))
  })
  test('WALLET GET: enforces ownership', () => {
    assert.ok(walletGetSource.includes('requireAuthenticatedUser(userId, request)'))
  })

  test('BUYER WALLET GET: requires authentication', () => {
    assert.ok(buyerWalletGetSource.includes('requireAuthenticatedUser'))
  })
  test('BUYER WALLET GET: enforces ownership', () => {
    assert.ok(buyerWalletGetSource.includes('requireAuthenticatedUser(userId, request)'))
  })

  test('MERCHANT WALLET GET: requires authentication', () => {
    assert.ok(merchantWalletGetSource.includes('requireAuthenticatedUser'))
  })
  test('MERCHANT WALLET GET: enforces ownership', () => {
    assert.ok(merchantWalletGetSource.includes('requireAuthenticatedUser(merchantId, request)'))
  })

  test('CHECKOUT INITIATE: requires authentication', () => {
    assert.ok(checkoutInitSource.includes('requireAuthenticatedUser'))
  })

  test('WALLET FUND: enforces ownership', () => {
    assert.ok(walletFundSource.includes('auth.user.id !== userId'))
  })
  test('WALLET PAY: enforces ownership', () => {
    assert.ok(walletPaySource.includes('auth.user.id !== userId'))
  })
  test('WALLET CONVERT: enforces ownership', () => {
    assert.ok(walletConvertSource.includes('auth.user.id !== userId'))
  })

  // ── 6. Migration file ────────────────────────────────────────────────────

  console.log('\nMigration File:')

  test('Migration adds payment_reference column to orders', () => {
    assert.ok(migrationSource.includes('ADD COLUMN IF NOT EXISTS payment_reference text'))
  })
  test('Migration adds payment_provider column to orders', () => {
    assert.ok(migrationSource.includes('ADD COLUMN IF NOT EXISTS payment_provider text'))
  })
  test('Migration adds payment_submitted_at column to orders', () => {
    assert.ok(migrationSource.includes('ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz'))
  })
  test('Migration adds payment_confirmed_at column to orders', () => {
    assert.ok(migrationSource.includes('ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz'))
  })
  test('Migration adds orchid_status to auth_users with default not_started', () => {
    assert.ok(migrationSource.includes("ADD COLUMN IF NOT EXISTS orchid_status text NOT NULL DEFAULT 'not_started'"))
  })
  test('Migration creates partial unique index on payment_reference', () => {
    assert.ok(migrationSource.includes('idx_orders_payment_reference_unique'))
    assert.ok(migrationSource.includes('WHERE payment_reference IS NOT NULL'))
  })
  test('Migration has CHECK constraint on orchid_status', () => {
    assert.ok(migrationSource.includes("CHECK (orchid_status IN ('not_started', 'pending', 'approved', 'rejected'))"))
  })
  test('Migration uses BEGIN/COMMIT', () => {
    assert.ok(migrationSource.includes('BEGIN;') && migrationSource.includes('COMMIT;'))
  })

  // ── 7. updateOrderStatus function ────────────────────────────────────────

  console.log('\nOrder Status Update:')

  test('updateOrderStatus function exists and is exported', () => {
    assert.ok(orderSource.includes('export async function updateOrderStatus'))
  })

  test('updateOrderStatus handles cancelled status with refund', () => {
    assert.ok(orderSource.includes("normalizedStatus === 'cancelled'"))
    assert.ok(orderSource.includes('refundAmount'))
  })

  test('updateOrderStatus handles delivered status with escrow release', () => {
    assert.ok(orderSource.includes("normalizedStatus === 'delivered'"))
    assert.ok(orderSource.includes('releaseFundsFromEscrow'))
  })

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  if (failed > 0) process.exitCode = 1
}

main()
