'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/marketplace'
  return value
}

export default function OAuthCallbackCompletePage() {
  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const next = safeNextPath(params.get('next'))
      const supabase = createClient()

      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        window.location.replace(next)
        return
      }

      await new Promise((resolve) => window.setTimeout(resolve, 500))
      const retry = await supabase.auth.getSession()
      if (retry.data.session?.user) {
        window.location.replace(next)
        return
      }

      window.location.replace('/marketplace?oauth_error=Session%20was%20not%20available%20after%20Google%20sign-in')
    }

    void run()
  }, [])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Completing Google sign-in…</p>
    </main>
  )
}
