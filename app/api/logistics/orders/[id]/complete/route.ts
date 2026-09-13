import { requireAdmin } from '@/lib/supabase/require-admin'
import { NextRequest, NextResponse } from 'next/server'
import { completeLogisticsOrder } from '@/lib/logistics-actions'

async function isAuthorized(request: NextRequest) { try { await requireAdmin('trade-logistics'); return true } catch { return false } }

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized logistics access' }, { status: 401 })
    }

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
