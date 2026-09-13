import { requireAdmin } from '@/lib/supabase/require-admin'
import { NextRequest, NextResponse } from 'next/server'
import { getLogisticsOrders, registerOrderForLogistics } from '@/lib/logistics-actions'

async function isAuthorized(request: NextRequest) { try { await requireAdmin('trade-logistics'); return true } catch { return false } }

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized logistics access' }, { status: 401 })
    }

    const result = await getLogisticsOrders()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Logistics orders GET API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const result = await registerOrderForLogistics(payload)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Logistics orders POST API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
