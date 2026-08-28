import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next') ?? '/marketplace'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/marketplace'

  if (!code) {
    return NextResponse.redirect(`${origin}/marketplace?error=auth_failed`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error?.message)
    return NextResponse.redirect(`${origin}/marketplace?error=auth_failed`)
  }

  // Upsert into auth_users using admin client (role set client-side via pendingOAuthRole)
  try {
    const admin = createAdminClient()
    const userId = data.user.id
    const userEmail = data.user.email || ''
    const userName = data.user.user_metadata?.full_name
      || data.user.user_metadata?.name
      || userEmail.split('@')[0]

    const { data: existing } = await admin
      .from('auth_users')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existing) {
      await admin.from('auth_users').insert({
        id: userId,
        email: userEmail,
        name: userName,
        full_name: userName,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        google_id: data.user.user_metadata?.sub || null,
        role: 'buyer', // default; client updates via pendingOAuthRole
        password_hash: '',
        phone: '',
        token_balance: 0,
      })
    }
  } catch {
    // Non-blocking
  }

  return NextResponse.redirect(`${origin}${next}`)
}

