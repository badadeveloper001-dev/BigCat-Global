'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/marketplace'
  }

  return value
}

export default function OAuthCompletePage() {
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    const completeSignIn = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const next = safeNextPath(params.get('next'))
      const supabase = createClient()

      try {
        // createBrowserClient may already exchange the PKCE code while it starts.
        // Reuse that session first, then exchange explicitly when necessary.
        let { data: sessionData } = await supabase.auth.getSession()
        let session = sessionData.session

        if (!session && code) {
          const exchange = await supabase.auth.exchangeCodeForSession(code)
          session = exchange.data.session

          if (exchange.error && !session) {
            // The automatic exchange and this effect can briefly race. Check once
            // more before treating the callback as failed.
            await new Promise((resolve) => window.setTimeout(resolve, 250))
            const retry = await supabase.auth.getSession()
            session = retry.data.session

            if (!session) {
              throw exchange.error
            }
          }
        }

        if (!session?.user) {
          throw new Error(code ? 'Google sign-in did not create a session.' : 'Google did not return an authorization code.')
        }

        const authUser = session.user
        const fallbackUser = {
          userId: authUser.id,
          email: authUser.email || '',
          phone: '',
          name: authUser.user_metadata?.full_name
            || authUser.user_metadata?.name
            || authUser.email?.split('@')[0]
            || '',
          role: 'buyer' as const,
        }

        // Persist the authenticated buyer before leaving this callback page.
        // RoleProvider can then render the marketplace immediately while the
        // application profile is synchronized in the background.
        localStorage.setItem('userRole', 'buyer')
        localStorage.setItem('userData', JSON.stringify(fallbackUser))
        localStorage.removeItem('pendingOAuthRole')

        try {
          await fetch('/api/auth/oauth-profile', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: 'no-store',
          })
        } catch {
          // The Supabase session is authoritative; profile sync can be retried.
        }

        window.location.replace(next)
      } catch (error: any) {
        if (!isActive) return
        console.error('[auth/complete] OAuth completion failed:', error)
        setErrorMessage(error?.message || 'Google sign-in could not be completed.')
      }
    }

    void completeSignIn()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {errorMessage ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">Google sign-in could not be completed</h1>
            <p className="mt-3 text-sm text-muted-foreground">{errorMessage}</p>
            <a
              href="/marketplace"
              className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Return to sign in
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">Completing Google sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we securely open your marketplace account.</p>
          </>
        )}
      </div>
    </main>
  )
}
