import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

const CURRENCIES = ['NGN', 'USD', 'CNY']

/* Convert amount from one currency to another using provided rates (USD base) */
function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return amount
  const usdAmount = amount / (rates[from] ?? 1)
  return usdAmount * (rates[to] ?? 1)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(undefined, request)
  if (auth.response) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId, fromCurrency, toCurrency, amount, rates } = await request.json()

    if (!userId || !fromCurrency || !toCurrency || !amount) {
      return NextResponse.json({ success: false, error: 'userId, fromCurrency, toCurrency and amount are required' }, { status: 400 })
    }
    if (fromCurrency === toCurrency) {
      return NextResponse.json({ success: false, error: 'Cannot convert to the same currency' }, { status: 400 })
    }
    if (!CURRENCIES.includes(fromCurrency) || !CURRENCIES.includes(toCurrency)) {
      return NextResponse.json({ success: false, error: 'Invalid currency' }, { status: 400 })
    }

    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
    }

    // Use provided live rates or fallback
    const fxRates = rates || { USD: 1, NGN: 1620, CNY: 7.26 }
    const convertedAmount = convert(numAmount, fromCurrency, toCurrency, fxRates)
    const fxRate = convertedAmount / numAmount

    const supabase = await createClient()

    // Get current balances
    const { data: wallets } = await supabase
      .from('user_wallets')
      .select('currency, balance')
      .eq('user_id', userId)
      .in('currency', [fromCurrency, toCurrency]) as any

    const fromWallet = wallets?.find((w: any) => w.currency === fromCurrency)
    const toWallet = wallets?.find((w: any) => w.currency === toCurrency)

    const fromBalance = Number(fromWallet?.balance || 0)
    const toBalance = Number(toWallet?.balance || 0)

    if (fromBalance < numAmount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient ${fromCurrency} balance. Available: ${fromBalance.toFixed(2)}`,
        balance: fromBalance,
      }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Debit from source
    await supabase
      .from('user_wallets')
      .upsert({ user_id: userId, currency: fromCurrency, balance: fromBalance - numAmount, updated_at: now })
      .eq('user_id', userId).eq('currency', fromCurrency)

    // Credit to target
    await supabase
      .from('user_wallets')
      .upsert({ user_id: userId, currency: toCurrency, balance: toBalance + convertedAmount, updated_at: now })
      .eq('user_id', userId).eq('currency', toCurrency)

    // Record both sides
    await supabase.from('wallet_transactions').insert([
      {
        user_id: userId, currency: fromCurrency, type: 'convert_out',
        amount: numAmount, balance_after: fromBalance - numAmount,
        description: `Converted ${fromCurrency} ${numAmount} → ${toCurrency} ${convertedAmount.toFixed(4)}`,
        fx_rate: fxRate,
      },
      {
        user_id: userId, currency: toCurrency, type: 'convert_in',
        amount: convertedAmount, balance_after: toBalance + convertedAmount,
        description: `Received ${toCurrency} ${convertedAmount.toFixed(4)} from ${fromCurrency}`,
        fx_rate: fxRate,
      },
    ])

    return NextResponse.json({
      success: true,
      fromAmount: numAmount,
      toAmount: convertedAmount,
      fromCurrency,
      toCurrency,
      fxRate,
      newFromBalance: fromBalance - numAmount,
      newToBalance: toBalance + convertedAmount,
    })
  } catch (err: any) {
    console.error('[wallet/convert] error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
