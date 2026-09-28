import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@/lib/supabase/server'
import { getRequestAuthUser } from '@/lib/supabase/request-auth'
import { getUserProfile } from '@/lib/user-actions'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getRequestAuthUser(request)

  if (!user) {
    return NextResponse.json(
      { success: false, error: authError || 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const admin = createAdminClient()
    const email = user.email || ''
    const metadata = user.user_metadata || {}
    const name = metadata.full_name || metadata.name || email.split('@')[0]
    const avatarUrl = metadata.avatar_url || metadata.picture || null
    const googleId = metadata.sub || user.identities?.[0]?.identity_data?.sub || null

    const { data: existing, error: lookupError } = await admin
      .from('auth_users')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (lookupError) {
      throw lookupError
    }

    if (existing) {
      const { error: updateError } = await admin
        .from('auth_users')
        .update({
          name,
          full_name: name,
          avatar_url: avatarUrl,
          google_id: googleId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ success: true, data: { id: user.id, role: existing.role || 'buyer' } })
    }

    const { error: insertError } = await admin.from('auth_users').insert({
      id: user.id,
      email,
      name,
      full_name: name,
      avatar_url: avatarUrl,
      google_id: googleId,
      role: 'buyer',
      password_hash: '',
      phone: '',
      token_balance: 0,
    })

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ success: true, data: { id: user.id, role: 'buyer' } })
  } catch (profileError: any) {
    console.error('[api/auth/oauth-profile] profile sync failed:', profileError)
    return NextResponse.json(
      { success: false, error: profileError?.message || 'Profile synchronization failed' },
      { status: 500 }
    )
  }
}


export async function GET(request: NextRequest) {
  const { user, error: authError } = await getRequestAuthUser(request)

  if (!user) {
    return NextResponse.json(
      { success: false, error: authError || 'Authentication required' },
      { status: 401 }
    )
  }

  const result = await getUserProfile(user.id)
  if (!result.success) {
    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
        role: 'buyer',
      },
    })
  }

  return NextResponse.json({ success: true, data: result.data })
}
