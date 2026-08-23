import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { assignRiderToOrder } from '@/lib/logistics-actions'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminAuth = await requireAdminUser(request)
    if (adminAuth.response) return adminAuth.response

    const { id } = await params
    const body = await request.json()
    const riderId = String(body?.riderId || '').trim()

    if (!id || !riderId) {
      return NextResponse.json({ success: false, error: 'Order id and rider id are required.' }, { status: 400 })
    }

    const result = await assignRiderToOrder(id, riderId, body?.notes)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Assign rider API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
