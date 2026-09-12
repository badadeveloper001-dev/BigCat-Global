"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Lock, Loader2, AlertCircle, ArrowLeft } from "lucide-react"

const ACCESS_CODES: Record<string, string> = {
  ORCHID_012: "/admin/orchid",
  BIGCAT_00: "/admin/bigcat",
  TRADELOG_001: "/admin/trade-logistics",
}

export default function AdminPortalPage() {
  const router = useRouter()
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const trimmed = accessCode.trim().toUpperCase()
    const redirectUrl = ACCESS_CODES[trimmed]

    if (redirectUrl) {
      sessionStorage.setItem("adminAccess", trimmed)
      router.push(redirectUrl)
    } else {
      setError("Invalid access code")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-gray-900 rounded-2xl px-6 py-3 mb-4 shadow-md">
            <Image
              src="/image.png"
              alt="BigCat Global logo"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Powered By</p>
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground">
              Orchid Payments
            </div>
            <Image
              src="/image.png"
              alt="BigCat logo"
              width={80}
              height={70}
              className="object-contain mix-blend-multiply dark:mix-blend-screen"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BigCat Global Admin Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Restricted access — authorized personnel only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Access Code
            </label>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value)
                setError("")
              }}
              placeholder="Enter your access code"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !accessCode.trim()}
            className="w-full py-3 bg-destructive text-destructive-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {isLoading ? "Verifying..." : "Enter Admin Portal"}
          </button>
        </form>

        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>
      </div>
    </div>
  )
}
