import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { getRecentOrders } from '@/lib/admin-actions'

export async function GET(request: NextRequest) {
  const adminAuth = await requireAdminUser(request)
  if (adminAuth.response) return adminAuth.response

  try {
    const result = await getRecentOrders()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin orders API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
