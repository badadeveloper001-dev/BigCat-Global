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
    const orderId = body?.orderId ? String(body.orderId).trim() : null
    const reason = String(body?.reason || 'Wallet payment').trim()

    if (!buyerId) {
      return NextResponse.json({ success: false, error: 'buyerId is required' }, { status: 400 })
    }

    // Ownership check: authenticated user can only debit their own wallet
    if (auth.user.id !== buyerId) {
      return NextResponse.json({ success: false, error: 'You can only debit your own wallet' }, { status: 403 })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check current balance before debiting
    const txResult = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('buyer_id', buyerId)

    if (txResult.error) {
      const message = String(txResult.error?.message || '').toLowerCase()
      const isMissingTable = message.includes('does not exist') || message.includes('relation') || message.includes('schema cache')
      if (isMissingTable) {
        return NextResponse.json({ success: false, error: 'Wallet ledger is not available in this environment' }, { status: 503 })
      }
      console.error('[buyer/wallet/debit] Balance check error:', txResult.error)
      return NextResponse.json({ success: false, error: 'Could not verify balance' }, { status: 500 })
    }

    const txRows = Array.isArray(txResult.data) ? txResult.data : []
    const creditTypes = new Set(['wallet_credit', 'refund', 'payment', 'escrow_release'])
    const debitTypes = new Set(['wallet_debit', 'withdrawal'])

    const currentBalance = txRows.reduce((sum: number, tx: any) => {
      const type = String(tx?.type || '').toLowerCase().trim()
      const amt = Math.max(0, Number(tx?.amount || 0))
      if (!amt) return sum
      if (creditTypes.has(type)) return sum + amt
      if (debitTypes.has(type)) return sum - amt
      return sum
    }, 0)

    if (currentBalance < amount) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient wallet balance',
        currentBalance,
      }, { status: 400 })
    }

    const insertPayload: Record<string, any> = {
      buyer_id: buyerId,
      type: 'wallet_debit',
      amount,
      reason,
      status: 'completed',
    }
    if (orderId) insertPayload.order_id = orderId

    const { data, error } = await supabase
      .from('transactions')
      .insert([insertPayload])
      .select('id, amount, created_at')
      .single()

    if (error) {
      console.error('[buyer/wallet/debit] Insert error:', error)
      return NextResponse.json({ success: false, error: 'Failed to debit wallet' }, { status: 500 })
    }

    const newBalance = currentBalance - amount

    return NextResponse.json({ success: true, transaction: data, amount, newBalance })
  } catch (err: any) {
    console.error('[buyer/wallet/debit] Error:', err)
    return NextResponse.json({ success: false, error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
