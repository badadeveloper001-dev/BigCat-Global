import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@/lib/supabase/server'
import { createOAuthServerClient } from '@/lib/supabase/oauth-server'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/marketplace'
  }

  return value
}

function safeRole(value: string | null) {
  return value === 'merchant' ? 'merchant' : 'buyer'
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = safeNextPath(requestUrl.searchParams.get('next'))
  const requestedRole = safeRole(requestUrl.searchParams.get('role'))

  if (!code) {
    const error = requestUrl.searchParams.get('error_description')
      || requestUrl.searchParams.get('error')
      || 'Google did not return an authorization code.'

    return NextResponse.redirect(
      new URL(`/marketplace?oauth_error=${encodeURIComponent(error)}`, requestUrl.origin),
    )
  }

  try {
    const response = NextResponse.redirect(new URL(`/auth/callback-complete?next=${encodeURIComponent(next)}&role=${encodeURIComponent(requestedRole)}`, requestUrl.origin))
    const supabase = await createOAuthServerClient(response)
    const { data: exchangeData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !exchangeData.session?.user) {
      console.error('[auth/callback] OAuth code exchange failed:', exchangeError)
      return NextResponse.redirect(
        new URL(
          `/marketplace?oauth_error=${encodeURIComponent(exchangeError?.message || 'Unable to exchange external code.')}`,
          requestUrl.origin,
        ),
      )
    }

    const user = exchangeData.session.user
    const admin = createAdminClient()
    const email = user.email || ''
    const metadata = user.user_metadata || {}
    const name =
      metadata.full_name
      || metadata.name
      || email.split('@')[0]
    const avatarUrl = metadata.avatar_url || metadata.picture || null
    const googleId =
      metadata.sub
      || user.identities?.[0]?.identity_data?.sub
      || null

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
    } else {
      const { error: insertError } = await admin
        .from('auth_users')
        .insert({
          id: user.id,
          email,
          name,
          full_name: name,
          avatar_url: avatarUrl,
          google_id: googleId,
          role: requestedRole,
          password_hash: '',
          phone: '',
          token_balance: 0,
        })

      if (insertError) {
        throw insertError
      }
    }

    return response
  } catch (error: any) {
    console.error('[auth/callback] OAuth completion failed:', error)

    return NextResponse.redirect(
      new URL(
        `/marketplace?oauth_error=${encodeURIComponent(error?.message || 'Google sign-in could not be completed.')}`,
        requestUrl.origin,
      ),
    )
  }
}
