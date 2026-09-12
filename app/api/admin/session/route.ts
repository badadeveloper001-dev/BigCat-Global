import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'

export async function GET(request: NextRequest) {
  const adminAuth = await requireAdminUser(request)
  if (adminAuth.response) return adminAuth.response

  return NextResponse.json({
    success: true,
    admin: {
      id: adminAuth.user.id,
      email: adminAuth.user.email || adminAuth.profile.email || null,
      role: adminAuth.profile.role,
    },
  })
}
