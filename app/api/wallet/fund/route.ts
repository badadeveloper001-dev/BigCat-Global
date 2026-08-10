import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

const CURRENCIES = ['NGN', 'USD', 'CNY']

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(undefined, request)
  if (auth.response) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId, currency, amount, reference, description } = await request.json()

    if (!userId || !currency || !amount) {
      return NextResponse.json({ success: false, error: 'userId, currency and amount are required' }, { status: 400 })
    }
    if (!CURRENCIES.includes(currency)) {
      return NextResponse.json({ success: false, error: 'Invalid currency. Use NGN, USD or CNY' }, { status: 400 })
    }
    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 })
    }

    const supabase = await createClient()

    // Upsert wallet row (create if first time)
    await supabase.from('user_wallets').upsert(
      { user_id: userId, currency, balance: 0, locked_balance: 0 },
      { onConflict: 'user_id,currency', ignoreDuplicates: true }
    )

    // Increment balance atomically
    const { data: updated, error: updateErr } = await supabase.rpc('increment_wallet_balance', {
      p_user_id: userId,
      p_currency: currency,
      p_amount: numAmount,
    }) as any

    if (updateErr) {
      // Fallback: manual update if RPC doesn't exist yet
      const { data: current } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', currency)
        .single() as any

      const newBalance = Number(current?.balance || 0) + numAmount
      await supabase
        .from('user_wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('currency', currency)

      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        currency,
        type: 'credit',
        amount: numAmount,
        balance_after: newBalance,
        reference: reference || null,
        description: description || `Wallet funded with ${currency} ${numAmount}`,
      })

      return NextResponse.json({ success: true, balance: newBalance, currency })
    }

    return NextResponse.json({ success: true, currency })
  } catch (err: any) {
    console.error('[wallet/fund] error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
