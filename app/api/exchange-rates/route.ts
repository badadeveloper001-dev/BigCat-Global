import { NextResponse } from 'next/server'

export const runtime = 'edge'

const FALLBACK_RATES = { USD: 1, NGN: 1620, CNY: 7.26 }

type ProviderResult = {
  rates: { USD: number; NGN: number; CNY: number }
  provider: string
  updatedAt: string
}

async function fetchProviderRates(): Promise<ProviderResult> {
  const upstreams = [
    {
      name: 'exchangerate.host',
      url: 'https://api.exchangerate.host/latest?base=USD&symbols=NGN,CNY',
      parse: (data: any) => ({
        NGN: Number(data?.rates?.NGN),
        CNY: Number(data?.rates?.CNY),
        updatedAt: data?.date ? new Date(`${String(data.date)}T00:00:00Z`).toISOString() : new Date().toISOString(),
      }),
    },
    {
      name: 'frankfurter.app',
      url: 'https://api.frankfurter.app/latest?from=USD&to=NGN,CNY',
      parse: (data: any) => ({
        NGN: Number(data?.rates?.NGN),
        CNY: Number(data?.rates?.CNY),
        updatedAt: data?.date ? new Date(`${String(data.date)}T00:00:00Z`).toISOString() : new Date().toISOString(),
      }),
    },
  ] as const

  for (const upstream of upstreams) {
    try {
      const res = await fetch(upstream.url, { cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      const parsed = upstream.parse(data)

      if (!Number.isFinite(parsed.NGN) || parsed.NGN <= 0 || !Number.isFinite(parsed.CNY) || parsed.CNY <= 0) {
        continue
      }

      return {
        provider: upstream.name,
        updatedAt: parsed.updatedAt,
        rates: {
          USD: 1,
          NGN: parsed.NGN,
          CNY: parsed.CNY,
        },
      }
    } catch {
      // Try the next provider.
    }
  }

  throw new Error('all_rate_providers_failed')
}

export async function GET() {
  try {
    const upstream = await fetchProviderRates()
    return NextResponse.json(
      {
        success: true,
        rates: upstream.rates,
        source: 'live',
        base: 'USD',
        provider: upstream.provider,
        updatedAt: upstream.updatedAt,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    )
  } catch {
    return NextResponse.json(
      {
        success: true,
        rates: FALLBACK_RATES,
        source: 'fallback',
        base: 'USD',
        provider: 'fallback',
        updatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    )
  }
}
