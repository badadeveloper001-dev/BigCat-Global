import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const revalidate = 300 // cache 5 min

const FALLBACK_RATES = { USD: 1, NGN: 1620, CNY: 7.26 }

export async function GET() {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=NGN,CNY',
      { next: { revalidate: 300 } }
    )

    if (!res.ok) throw new Error('rate_fetch_failed')

    const data = await res.json()
    const rates = {
      USD: 1,
      NGN: Number(data.rates?.NGN || FALLBACK_RATES.NGN),
      CNY: Number(data.rates?.CNY || FALLBACK_RATES.CNY),
    }

    return NextResponse.json({ success: true, rates, source: 'live', base: 'USD' })
  } catch {
    return NextResponse.json({
      success: true,
      rates: FALLBACK_RATES,
      source: 'fallback',
      base: 'USD',
    })
  }
}
