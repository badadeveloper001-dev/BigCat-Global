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
      const userId = data.user.id
      const userEmail = data.user.email || ''
      const userName = data.user.user_metadata?.full_name
        || data.user.user_metadata?.name
        || userEmail.split('@')[0]

      // Store role in Supabase user_metadata so RoleContext can read it without querying auth_users
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { ...data.user.user_metadata, role },
      }).catch(() => {})

      // Upsert into auth_users — non-blocking, missing columns are handled gracefully
      try {
        const { data: existing } = await supabase
          .from('auth_users')
          .select('id')
          .eq('id', userId)
          .single()

        if (!existing) {
          await supabase.from('auth_users').insert({
            id: userId,
            email: userEmail,
            name: userName,
            full_name: userName,
            avatar_url: data.user.user_metadata?.avatar_url || null,
            google_id: data.user.user_metadata?.sub || null,
            role,
            password_hash: '',
            phone: '',
            token_balance: 0,
          })
        }
      } catch {
        // Non-blocking — role is already in user_metadata above
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/marketplace?error=auth_failed`)
}
