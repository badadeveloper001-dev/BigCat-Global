import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CURRENCIES = ['NGN', 'USD', 'CNY'] as const
type Currency = typeof CURRENCIES[number]

/* Ensure a wallet row exists for every currency — idempotent */
async function ensureWallets(supabase: any, userId: string) {
  for (const currency of CURRENCIES) {
    await supabase.from('user_wallets').upsert(
      { user_id: userId, currency, balance: 0, locked_balance: 0 },
      { onConflict: 'user_id,currency', ignoreDuplicates: true }
    )
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')?.trim()
  if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })

  try {
    const supabase = await createClient()
    await ensureWallets(supabase, userId)

    const { data: wallets, error } = await supabase
      .from('user_wallets')
      .select('currency, balance, locked_balance, updated_at')
      .eq('user_id', userId)

    if (error) throw error

    const { data: txs } = await supabase
      .from('wallet_transactions')
      .select('id, currency, type, amount, description, fx_rate, order_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    const walletMap: Record<string, any> = {}
    for (const c of CURRENCIES) walletMap[c] = { currency: c, balance: 0, locked_balance: 0 }
    for (const w of wallets || []) walletMap[w.currency] = w

    return NextResponse.json({
      success: true,
      wallets: Object.values(walletMap),
      transactions: txs || [],
    })
  } catch (err: any) {
    console.error('[wallet] GET error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
