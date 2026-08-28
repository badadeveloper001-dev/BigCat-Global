import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { getLogisticsOrders, registerOrderForLogistics } from '@/lib/logistics-actions'

export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdminUser(request)
    if (adminAuth.response) return adminAuth.response

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
