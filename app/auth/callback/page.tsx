'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/marketplace'
  }

  return value
}

export default function OAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code')
      const next = safeNextPath(searchParams.get('next'))
      const requestedRole = searchParams.get('role') === 'merchant' ? 'merchant' : 'buyer'

      if (!code) {
        const message =
          searchParams.get('error_description')
          || searchParams.get('error')
          || 'Google did not return an authorization code.'
        setError(message)
        return
      }

      const supabase = createClient()
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError || !data.session?.user) {
        console.error('[auth/callback] Browser OAuth code exchange failed:', exchangeError)
        setError(exchangeError?.message || 'Unable to complete Google sign-in.')
        return
      }

      localStorage.setItem('pendingOAuthRole', requestedRole)

      try {
        const response = await fetch('/api/auth/oauth-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        })

        if (!response.ok) {
          console.warn('[auth/callback] Profile sync returned', response.status)
        }
      } catch (profileError) {
        console.warn('[auth/callback] Profile sync request failed:', profileError)
      }

      window.location.replace(next)
    }

    void run()
  }, [router, searchParams])

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-2xl font-semibold">Google sign-in could not be completed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => router.replace('/')}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          >
            Return to sign in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Completing Google sign-in…</p>
    </main>
  )
}
