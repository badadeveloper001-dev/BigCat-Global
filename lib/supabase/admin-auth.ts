import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestAuthUser } from '@/lib/supabase/request-auth'

export type AdminAuthResult =
  | { user: { id: string; email?: string | null }; profile: Record<string, any>; response: null }
  | { user: null; profile: null; response: NextResponse }

export async function requireAdminUser(request: Request): Promise<AdminAuthResult> {
  const { user, error } = await getRequestAuthUser(request)

  if (error || !user) {
    return {
      user: null,
      profile: null,
      response: NextResponse.json(
        { success: false, error: 'Administrator authentication required' },
        { status: 401 },
      ),
    }
  }

  const supabase = createClient()
  const { data: profile, error: profileError } = await supabase
    .from('auth_users')
    .select('id, email, role, is_suspended')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.warn('[admin-auth] Admin profile lookup failed', {
      userId: user.id,
      error: profileError?.message,
    })
    return {
      user: null,
      profile: null,
      response: NextResponse.json(
        { success: false, error: 'Administrator access denied' },
        { status: 403 },
      ),
    }
  }

  if (String(profile.role || '').toLowerCase() !== 'admin' || profile.is_suspended === true) {
    console.warn('[admin-auth] Non-admin attempted an admin operation', {
      userId: user.id,
      role: profile.role,
    })
    return {
      user: null,
      profile: null,
      response: NextResponse.json(
        { success: false, error: 'Administrator access denied' },
        { status: 403 },
      ),
    }
  }

  return {
    user: { id: user.id, email: user.email },
    profile,
    response: null,
  }
}
