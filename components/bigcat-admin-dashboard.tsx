"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Globe2, Landmark, Shield, Ship, Store, Users } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"

type PlatformStats = {
  totalUsers: number
  totalMerchants: number
  totalOrders: number
  totalRevenue: number
}

interface BigcatAdminDashboardProps {
  bypassAccessCheck?: boolean
}

export function BigcatAdminDashboard({ bypassAccessCheck = false }: BigcatAdminDashboardProps = {}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalMerchants: 0,
    totalOrders: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    if (bypassAccessCheck) {
      setAuthorized(true)
      return
    }
    router.replace("/admin-portal")
  }, [bypassAccessCheck, router])

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

  const cards = useMemo(
    () => [
      { label: "Users", value: String(stats.totalUsers), icon: Users },
      { label: "Merchants", value: String(stats.totalMerchants), icon: Store },
      { label: "Orders", value: String(stats.totalOrders), icon: Ship },
      { label: "Revenue", value: formatCurrency(stats.totalRevenue, "USD"), icon: Landmark },
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
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-semibold">BigCat Global Admin</h1>
          <span className="text-xs text-muted-foreground">Global Control</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Globe2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Cross-Border Commerce Overview</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            BigCat Global connects verified buyers and merchants between Nigeria and China with AI-assisted trade operations.
          </p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <card.icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
              <p className="text-xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push("/admin/orchid")}
            className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors"
          >
            <h3 className="font-semibold">Orchid Admin</h3>
            <p className="text-sm text-muted-foreground mt-1">Payment rails, wallet monitoring, and trade protection readiness.</p>
          </button>
          <button
            onClick={() => router.push("/admin/trade-logistics")}
            className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors"
          >
            <h3 className="font-semibold">Trade & Logistics Admin</h3>
            <p className="text-sm text-muted-foreground mt-1">Freight, customs status, milestones, and international shipment visibility.</p>
          </button>
          <button
            onClick={() => router.push("/admin-portal")}
            className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors"
          >
            <h3 className="font-semibold">Security Access</h3>
            <p className="text-sm text-muted-foreground mt-1">Manage privileged access for BigCat, Orchid, and Trade & Logistics admins.</p>
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Role Model</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Active roles: Buyer, Merchant, BigCat Admin, Orchid Admin, Trade & Logistics Admin, Customer Support.
          </p>
        </section>

        {loading ? <p className="text-sm text-muted-foreground">Refreshing platform stats...</p> : null}
      </main>
    </div>
  )
}
