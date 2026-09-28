import { NextRequest, NextResponse } from 'next/server'
import { getMerchants } from '@/lib/admin-actions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buyerLat = Number(searchParams.get('buyerLat'))
    const buyerLng = Number(searchParams.get('buyerLng'))

    const result = await getMerchants({
      buyerLat: Number.isFinite(buyerLat) ? buyerLat : null,
      buyerLng: Number.isFinite(buyerLng) ? buyerLng : null,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get merchants API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function verificationRequiredResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'Merchant approval is now handled through business verification review.',
    },
    { status: 410 }
  )
}

export async function PATCH(_request: NextRequest) {
  return verificationRequiredResponse()
}

export async function DELETE(_request: NextRequest) {
  return verificationRequiredResponse()
}
