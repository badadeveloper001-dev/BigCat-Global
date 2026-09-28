"use client"
import { UiText, UiValue, UiAttributes } from "@/components/ui-language"


import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Globe2, Landmark, Loader2, Shield, Ship, Store, Users } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"

type PlatformStats = {
  totalUsers: number
  totalMerchants: number
  totalOrders: number
  totalRevenue: number
}

export function BigcatAdminDashboard() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [verificationSubmissions, setVerificationSubmissions] = useState<any[]>([])
  const [loadingVerificationSubmissions, setLoadingVerificationSubmissions] = useState(true)
  const [showVerificationAccess, setShowVerificationAccess] = useState(false)
  const [verificationAccessCode, setVerificationAccessCode] = useState("")
  const [verificationAccessLoading, setVerificationAccessLoading] = useState(false)
  const [verificationAccessMessage, setVerificationAccessMessage] = useState<string | null>(null)

  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalMerchants: 0,
    totalOrders: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    fetch('/api/admin/session', { cache: 'no-store' }).then(r => r.json()).then(result => {
      if (result.scope === 'bigcat' || result.scope === 'bigcat') setAuthorized(true)
      else router.replace('/admin-portal')
    }).catch(() => router.replace('/admin-portal'))
  }, [router])

  useEffect(() => {
    if (!authorized) return
    const loadVerificationSubmissions = async () => {
      setLoadingVerificationSubmissions(true)
      try {
        const response = await fetch("/api/admin/merchant-verification?status=submitted", { cache: "no-store" })
        const result = await response.json()
        if (result?.success) setVerificationSubmissions(result.data || [])
      } catch (error) {
        console.error("Error loading merchant verification submissions:", error)
      } finally {
        setLoadingVerificationSubmissions(false)
      }
    }
    loadVerificationSubmissions()
  }, [authorized])

  useEffect(() => {
    if (!authorized) return
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/admin/stats", { cache: "no-store" })
        const result = await response.json()
        if (result?.success) {
          setStats({
            totalUsers: Number(result?.platform?.totalUsers || 0),
            totalMerchants: Number(result?.platform?.totalMerchants || 0),
            totalOrders: Number(result?.platform?.totalOrders || 0),
            totalRevenue: Number(result?.platform?.totalRevenue || 0),
          })
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authorized])

  const handleVerificationAccess = async () => {
    setVerificationAccessLoading(true)
    setVerificationAccessMessage(null)
    try {
      const response = await fetch("/api/admin/merchant-verification/review-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationAccessCode }),
      })
      const result = await response.json()
      if (!response.ok || !result?.success) {
        setVerificationAccessMessage(result?.error || "Unable to verify admin access.")
        return
      }
      setVerificationAccessMessage("Review access granted for 10 minutes.")
      setVerificationAccessCode("")
    } catch {
      setVerificationAccessMessage("Unable to verify admin access.")
    } finally {
      setVerificationAccessLoading(false)
    }
  }

  const cards = useMemo(
    () => [
      { label: "Users", value: String(stats.totalUsers), icon: Users },
      { label: "Merchants", value: String(stats.totalMerchants), icon: Store },
      { label: "Orders", value: String(stats.totalOrders), icon: Ship },
      { label: "Revenue", value: formatCurrency(stats.totalRevenue, "NGN"), icon: Landmark },
    ],
    [stats],
  )

  if (!authorized) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/marketplace")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> {" "}<UiText text={"Back"} />{" "}</button>
          <h1 className="font-semibold"><UiText text={"BigCat Global Admin"} /></h1>
          <span className="text-xs text-muted-foreground"><UiText text={"Global Control"} /></span>
        </div>
      </header>

      <div className="px-4 pt-3 text-right"><button className="text-sm text-muted-foreground" onClick={async () => { const response = await fetch('/api/admin/session', { method: 'DELETE' }); if (response.ok) window.location.assign('/admin-portal') }}><UiText text={"End admin session"} /></button></div>
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Globe2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold"><UiText text={"Cross-Border Commerce Overview"} /></h2>
          </div>
          <p className="text-sm text-muted-foreground">
            <UiText text={"BigCat Global connects verified buyers and merchants between Nigeria and China with AI-assisted trade operations."} />{" "}</p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <card.icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground"><UiText text={"Live"} /></span>
              </div>
              <p className="text-xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground"><UiValue value={card.label} /></p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold"><UiText text={"Business Verification"} /></h2>
              <p className="text-sm text-muted-foreground mt-1"><UiText text={"Submitted merchant business documents awaiting BigCat Admin review."} /></p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
              {verificationSubmissions.length} <UiText text={"submitted"} />
            </span>
          </div>
          {loadingVerificationSubmissions ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : verificationSubmissions.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-9 h-9 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground"><UiText text={"No submitted business verifications"} /></p>
            </div>
          ) : (
            <div className="space-y-3">
              {verificationSubmissions.map((verification) => {
                const merchant = verification.merchant
                const name = merchant?.business_name || merchant?.full_name || merchant?.email || "Unknown merchant"
                const country = verification.country === "NG" ? "Nigeria" : verification.country === "CN" ? "China" : verification.country
                const document = verification.document_type === "cac_certificate" ? "CAC Certificate" : "Business License"
                return (
                  <div key={verification.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{country} · {document}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1 break-all">{verification.registration_number}</p>
                      </div>
                      <button
                        onClick={() => {
                          setVerificationAccessMessage(null)
                          setVerificationAccessCode("")
                          setShowVerificationAccess(true)
                        }}
                        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                      >
                        <UiText text={"Review Document"} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <button onClick={() => router.push('/admin/bigcat/manage')} className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors">
            <h3 className="font-semibold"><UiText text={"Users & Merchants"} /></h3>
            <p className="text-sm text-muted-foreground mt-1"><UiText text={"Manage accounts and merchant approvals."} /></p>
          </button>
          <button
            onClick={() => router.push("/admin/orchid")}
            className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors"
          >
            <h3 className="font-semibold"><UiText text={"Orchid Admin"} /></h3>
            <p className="text-sm text-muted-foreground mt-1"><UiText text={"Payment rails, wallet monitoring, and trade protection readiness."} /></p>
          </button>
          <button
            onClick={() => router.push("/admin/trade-logistics")}
            className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors"
          >
            <h3 className="font-semibold"><UiText text={"Trade & Logistics Admin"} /></h3>
            <p className="text-sm text-muted-foreground mt-1"><UiText text={"Freight, customs status, milestones, and international shipment visibility."} /></p>
          </button>
          <button
            onClick={() => router.push("/admin-portal")}
            className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors"
          >
            <h3 className="font-semibold"><UiText text={"Security Access"} /></h3>
            <p className="text-sm text-muted-foreground mt-1"><UiText text={"Enter an access code for another authorized dashboard."} /></p>
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold"><UiText text={"Role Model"} /></h2>
          </div>
          <p className="text-sm text-muted-foreground">
            <UiText text={"Active roles: Buyer, Merchant, BigCat Admin, Orchid Admin, Trade & Logistics Admin, Customer Support."} />{" "}</p>
        </section>

        {loading ? <p className="text-sm text-muted-foreground"><UiText text={"Refreshing platform stats..."} /></p> : null}

        {showVerificationAccess ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <h2 className="text-lg font-semibold"><UiText text={"BigCat Admin Verification"} /></h2>
              <p className="text-sm text-muted-foreground mt-2"><UiText text={"Enter the BigCat Admin access code to review a merchant business document."} /></p>
              <input
                type="password"
                value={verificationAccessCode}
                onChange={(event) => setVerificationAccessCode(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") handleVerificationAccess() }}
                autoComplete="off"
                className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Admin access code"
              />
              {verificationAccessMessage ? <p className="mt-3 text-sm text-muted-foreground">{verificationAccessMessage}</p> : null}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setShowVerificationAccess(false)} className="rounded-lg border border-border px-3 py-2 text-sm"><UiText text={"Cancel"} /></button>
                <button onClick={handleVerificationAccess} disabled={verificationAccessLoading || !verificationAccessCode} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {verificationAccessLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UiText text={"Verify & Continue"} />}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
