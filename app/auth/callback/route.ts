import { NextRequest, NextResponse } from 'next/server'
import { createOAuthServerClient } from '@/lib/supabase/oauth-server'
import { createClient as createAdminClient } from '@/lib/supabase/server'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/marketplace'
  return value
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeNextPath(url.searchParams.get('next'))
  const requestedRole = url.searchParams.get('role') === 'merchant' ? 'merchant' : 'buyer'

  if (!code) {
    const error = url.searchParams.get('error_description') || url.searchParams.get('error') || 'Google did not return an authorization code.'
    return NextResponse.redirect(new URL('/marketplace?oauth_error=' + encodeURIComponent(error), url.origin))
  }

  const response = NextResponse.redirect(new URL(next, url.origin))
  const supabase = await createOAuthServerClient(response)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] Server OAuth code exchange failed:', error)
    return NextResponse.redirect(new URL('/marketplace?oauth_error=' + encodeURIComponent(error?.message || 'Unable to complete Google sign-in.'), url.origin))
  }

  try {
    const admin = createAdminClient()
    const user = data.user
    const email = user.email || ''
    const metadata = user.user_metadata || {}
    const name = metadata.full_name || metadata.name || email.split('@')[0]
    const avatarUrl = metadata.avatar_url || metadata.picture || null
    const googleId = metadata.sub || user.identities?.[0]?.identity_data?.sub || null
    const { data: existing, error: lookupError } = await admin.from('auth_users').select('id, role').eq('id', user.id).maybeSingle()
    if (lookupError) throw lookupError

    if (existing) {
      if (existing.role !== requestedRole) {
        await supabase.auth.signOut()
        const accountType = existing.role === 'merchant' ? 'merchant' : 'buyer'
        const message = `This Gmail is already registered as a ${accountType} account. Please use the ${accountType} portal or a different Gmail.`
        return NextResponse.redirect(new URL('/?oauth_error=' + encodeURIComponent(message), url.origin))
      }

      const { error: updateError } = await admin.from('auth_users').update({ name, full_name: name, avatar_url: avatarUrl, google_id: googleId, updated_at: new Date().toISOString() }).eq('id', user.id)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await admin.from('auth_users').insert({ id: user.id, email, name, full_name: name, avatar_url: avatarUrl, google_id: googleId, role: requestedRole, password_hash: '', phone: '', token_balance: 0 })
      if (insertError) throw insertError
    }
  } catch (profileError) {
    console.error('[auth/callback] Profile sync failed:', profileError)
  }

  return response
}
