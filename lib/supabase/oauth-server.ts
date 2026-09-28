import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { NextResponse } from 'next/server'

export async function createOAuthServerClient(response?: NextResponse) {
  const cookieStore = await cookies()

  // Force Next.js to materialize the incoming cookie jar before the PKCE
  // exchange. The OAuth verifier is stored here by createBrowserClient.
  const initialCookies = cookieStore.getAll()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
      },
      cookies: {
        getAll() {
          return initialCookies
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
