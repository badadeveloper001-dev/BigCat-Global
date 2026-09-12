"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let active = true

    const verify = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token) {
        router.replace("/admin-portal")
        return
      }

      const response = await fetch("/api/admin/session", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        await supabase.auth.signOut()
        router.replace("/admin-portal")
        return
      }

      if (active) setAuthorized(true)
    }

    verify().catch(() => router.replace("/admin-portal"))
    return () => { active = false }
  }, [router])

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Verifying administrator access" />
      </div>
    )
  }

  return <>{children}</>
}
