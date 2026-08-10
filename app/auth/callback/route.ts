import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') || 'buyer'
  const next = searchParams.get('next') ?? '/marketplace'

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Upsert user profile in auth_users table
      try {
        const existing = await supabase
          .from('auth_users')
          .select('id, role')
          .eq('id', data.user.id)
          .single()

        if (existing.error && existing.error.code === 'PGRST116') {
          // New Google user — create profile
          await supabase.from('auth_users').insert({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
            full_name: data.user.user_metadata?.full_name,
            avatar_url: data.user.user_metadata?.avatar_url,
            google_id: data.user.user_metadata?.sub,
            role,
            password_hash: '',
            phone: '',
            token_balance: 0,
          })
        }
      } catch {
        // Non-blocking
      }

      const redirectPath = role === 'merchant' ? '/marketplace' : next
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/marketplace?error=auth_failed`)
}
