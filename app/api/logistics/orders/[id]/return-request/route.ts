import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { requestOrderReturn } from '@/lib/logistics-actions'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminAuth = await requireAdminUser(request)
    if (adminAuth.response) return adminAuth.response

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Order id is required.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = String(body?.reason || '').trim() || 'Product issue reported by buyer.'

    const result = await requestOrderReturn(id, reason, 'admin')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Return request API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
