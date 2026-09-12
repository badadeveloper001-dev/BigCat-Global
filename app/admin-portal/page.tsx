"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { AlertCircle, ArrowLeft, Loader2, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function AdminPortalPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const verifyExistingSession = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/admin/session", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        router.replace("/admin/bigcat")
        return
      }

      await supabase.auth.signOut()
      setIsLoading(false)
    }

    verifyExistingSession().catch(() => setIsLoading(false))
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError || !data.session) {
        setError("Invalid email or password.")
        return
      }

      const response = await fetch("/api/admin/session", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      })

      if (!response.ok) {
        await supabase.auth.signOut()
        setError("This account does not have administrator access.")
        return
      }

      router.replace("/admin/bigcat")
    } catch {
      setError("Administrator sign-in is temporarily unavailable.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-gray-900 rounded-2xl px-6 py-3 mb-4 shadow-md">
            <Image src="/image.png" alt="BigCat Global logo" width={64} height={64} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BigCat Global Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sign in with an authorized administrator account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setError("") }}
              autoComplete="username"
              required
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError("") }}
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {error ? (
            <div role="alert" className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {isLoading ? "Verifying..." : "Sign in securely"}
          </button>
        </form>

        <button onClick={() => router.push("/")} className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>
      </div>
    </div>
  )
}
