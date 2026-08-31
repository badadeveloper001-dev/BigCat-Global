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

export default function OAuthCallbackPage() {
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    const completeSignIn = async () => {
      const params = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = params.get('code')
      const next = safeNextPath(params.get('next'))
      const supabase = createClient()

      try {
        // Depending on the Supabase Auth flow configured for the project, the
        // provider can return either a PKCE code or tokens in the URL hash.
        let { data: sessionData } = await supabase.auth.getSession()
        let session = sessionData.session

        if (!session && hashParams.get('access_token') && hashParams.get('refresh_token')) {
          const tokenSession = await supabase.auth.setSession({
            access_token: hashParams.get('access_token')!,
            refresh_token: hashParams.get('refresh_token')!,
          })
          session = tokenSession.data.session

          if (tokenSession.error && !session) {
            throw tokenSession.error
          }
        }

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

        if (!session && (code || hashParams.get('access_token'))) {
          // Give createBrowserClient's URL detector one final opportunity to
          // persist the session before displaying an error.
          await new Promise((resolve) => window.setTimeout(resolve, 500))
          const retry = await supabase.auth.getSession()
          session = retry.data.session
        }

        if (!session?.user) {
          const providerError = params.get('error_description')
            || params.get('error')
            || hashParams.get('error_description')
            || hashParams.get('error')
          throw new Error(providerError || 'Google did not return a usable authorization response.')
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
        console.error('[auth/callback] OAuth completion failed:', error)
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
