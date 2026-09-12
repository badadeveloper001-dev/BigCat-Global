import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { completeLogisticsOrder } from '@/lib/logistics-actions'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminAuth = await requireAdminUser(request)
    if (adminAuth.response) return adminAuth.response

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Order id is required.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const result = await completeLogisticsOrder(id, body?.proofOfDeliveryUrl || null)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Complete logistics order API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
