import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { NextResponse } from 'next/server'

export async function createOAuthServerClient(response?: NextResponse) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (response) {
              response.cookies.set(name, value, options)
            } else {
              try {
                cookieStore.set(name, value, options)
              } catch {
                // Cookie mutation is handled by the route response when supported.
              }
            }
          })
        },
      },
    },
  )
}
