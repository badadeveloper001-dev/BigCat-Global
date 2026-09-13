import { requireAdmin } from '@/lib/supabase/require-admin'
import { NextRequest, NextResponse } from 'next/server'
import { markLogisticsOrderInTransit } from '@/lib/logistics-actions'

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

    const result = await markLogisticsOrderInTransit(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mark logistics in-transit API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
