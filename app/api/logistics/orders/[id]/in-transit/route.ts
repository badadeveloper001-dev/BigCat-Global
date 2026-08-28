import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { markLogisticsOrderInTransit } from '@/lib/logistics-actions'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminAuth = await requireAdminUser(request)
    if (adminAuth.response) return adminAuth.response

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
