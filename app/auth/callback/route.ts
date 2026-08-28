import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next') ?? '/marketplace'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/marketplace'
  const redirectUrl = `${origin}${next}`

  if (!code) {
    return NextResponse.redirect(`${origin}/marketplace?error=auth_failed`)
  }

  const cookieStore = await cookies()
  // Attach Supabase's refreshed auth cookies to the redirect response itself.
  // Mutating only the request cookie store can lose the session in some
  // Next.js/Vercel route-handler runtimes, which sends the user back to onboarding.
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error?.message)
    return NextResponse.redirect(`${origin}/marketplace?error=auth_failed`)
  }

  // Ensure the application profile exists for the Supabase Auth user. This is
  // deliberately non-blocking: the client can still hydrate a buyer from the
  // authenticated session if a legacy profile constraint prevents the insert.
  try {
    const admin = createAdminClient()
    const userId = data.user.id
    const userEmail = data.user.email || ''
    const metadata = data.user.user_metadata || {}
    const userName = metadata.full_name || metadata.name || userEmail.split('@')[0]
    const avatarUrl = metadata.avatar_url || metadata.picture || null
    const googleId = metadata.sub || data.user.identities?.[0]?.identity_data?.sub || null

    const { data: existing, error: lookupError } = await admin
      .from('auth_users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (lookupError) {
      console.error('[auth/callback] profile lookup failed:', lookupError.message)
    } else if (!existing) {
      const { error: insertError } = await admin.from('auth_users').insert({
        id: userId,
        email: userEmail,
        name: userName,
        full_name: userName,
        avatar_url: avatarUrl,
        google_id: googleId,
        role: 'buyer',
        password_hash: '',
        phone: '',
        token_balance: 0,
      })

      if (insertError) {
        console.error('[auth/callback] profile sync failed:', insertError.message)
      }
    }
  } catch (profileError) {
    console.error('[auth/callback] profile sync failed:', profileError)
  }

  return response
}
