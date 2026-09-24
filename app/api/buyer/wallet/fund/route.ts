import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(undefined, request)
  if (auth.response) return auth.response

  try {
    const body = await request.json()
    const buyerId = String(body?.buyerId || '').trim()
    const amount = Number(body?.amount || 0)
    const reason = String(body?.reason || 'Wallet top-up').trim()

    if (!buyerId) {
      return NextResponse.json({ success: false, error: 'buyerId is required' }, { status: 400 })
    }

    // Ownership check: authenticated user can only fund their own wallet
    if (auth.user.id !== buyerId) {
      return NextResponse.json({ success: false, error: 'You can only fund your own wallet' }, { status: 403 })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
    }

    if (amount > 1_000_000) {
      return NextResponse.json({ success: false, error: 'Maximum top-up is ₦1,000,000 per transaction' }, { status: 400 })
    }

    const supabase = await createClient()

    // Try to use the transactions table; gracefully handle if it doesn't exist
    const { data, error } = await supabase.from('transactions').insert([{
      buyer_id: buyerId,
      type: 'wallet_credit',
      amount,
      reason,
      status: 'completed',
    }]).select('id, amount, created_at').single()

    if (error) {
      const message = String(error?.message || '').toLowerCase()
      const isMissingTable = message.includes('does not exist') || message.includes('relation') || message.includes('schema cache')
      if (isMissingTable) {
        return NextResponse.json({ success: false, error: 'Wallet ledger is not available in this environment' }, { status: 503 })
      }
      console.error('[buyer/wallet/fund] Insert error:', error)
      return NextResponse.json({ success: false, error: 'Failed to fund wallet' }, { status: 500 })
    }

    return NextResponse.json({ success: true, transaction: data, amount })
  } catch (err: any) {
    console.error('[buyer/wallet/fund] Error:', err)
    return NextResponse.json({ success: false, error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
