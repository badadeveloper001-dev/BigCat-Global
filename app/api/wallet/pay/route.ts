import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

const CURRENCIES = ['NGN', 'USD', 'CNY']

/* Convert amount between currencies using USD base rates */
function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return amount
  const usdAmount = amount / (rates[from] ?? 1)
  return usdAmount * (rates[to] ?? 1)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(undefined, request)
  if (auth.response) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const {
      userId,
      payCurrency,       // currency user chooses to pay with
      payAmount,         // amount in payCurrency
      targetCurrency,    // the currency the merchant receives (usually NGN)
      targetAmount,      // amount expected in targetCurrency
      orderId,
      description,
      rates,             // live rates from client { USD: 1, NGN: ..., CNY: ... }
    } = await request.json()

    if (!userId || !payCurrency || !payAmount || !orderId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    if (!CURRENCIES.includes(payCurrency)) {
      return NextResponse.json({ success: false, error: 'Invalid payment currency' }, { status: 400 })
    }

    const numPayAmount = Number(payAmount)
    if (!Number.isFinite(numPayAmount) || numPayAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
    }

    const fxRates = rates || { USD: 1, NGN: 1620, CNY: 7.26 }

    const supabase = await createClient()

    // Check wallet balance
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('balance, locked_balance')
      .eq('user_id', userId)
      .eq('currency', payCurrency)
      .single() as any

    const available = Number(wallet?.balance || 0)

    if (available < numPayAmount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient ${payCurrency} balance. Available: ${available.toFixed(2)}, Required: ${numPayAmount.toFixed(2)}`,
        balance: available,
        currency: payCurrency,
      }, { status: 400 })
    }

    const newBalance = available - numPayAmount
    const now = new Date().toISOString()

    // Deduct from wallet
    const { error: updateErr } = await supabase
      .from('user_wallets')
      .update({ balance: newBalance, updated_at: now })
      .eq('user_id', userId)
      .eq('currency', payCurrency)

    if (updateErr) throw updateErr

    const fxRate = payCurrency !== (targetCurrency || 'NGN')
      ? numPayAmount / convert(numPayAmount, payCurrency, targetCurrency || 'NGN', fxRates)
      : 1

    // Record transaction
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      currency: payCurrency,
      type: 'payment',
      amount: numPayAmount,
      balance_after: newBalance,
      order_id: orderId,
      description: description || `Payment for order ${orderId}`,
      fx_rate: fxRate !== 1 ? fxRate : null,
    })

    return NextResponse.json({
      success: true,
      deducted: numPayAmount,
      currency: payCurrency,
      newBalance,
      orderId,
    })
  } catch (err: any) {
    console.error('[wallet/pay] error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
