import { NextResponse } from 'next/server'

/**
 * Legacy single-product checkout has been retired.
 *
 * Orders must be created through POST /api/orders/create, which requires an
 * authenticated buyer and uses the shared order/inventory transaction.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      code: 'LEGACY_CHECKOUT_RETIRED',
      error: 'This checkout flow is no longer available. Please use the cart checkout.',
      replacement: '/api/orders/create',
    },
    {
      status: 410,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
