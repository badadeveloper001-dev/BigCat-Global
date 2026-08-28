import { NextRequest, NextResponse } from 'next/server'
import { getRequestAuthUser } from '@/lib/supabase/request-auth'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, error: authError } = await getRequestAuthUser(request)
    if (authError || !user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    const buyerId = user.id
    const amount = Number(body?.amount || 0)
    const orderId = body?.orderId ? String(body.orderId).trim() : null
    const reason = String(body?.reason || 'Wallet payment').trim()

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Check current balance before debiting
    const txResult = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('buyer_id', buyerId)

    if (txResult.error) {
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
