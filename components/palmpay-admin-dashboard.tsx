"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CircleDollarSign, Clock4, CreditCard, ShieldCheck, Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"

interface PalmpayAdminDashboardProps {
  bypassAccessCheck?: boolean
  embedded?: boolean
}

export function PalmpayAdminDashboard({ bypassAccessCheck = false, embedded = false }: PalmpayAdminDashboardProps = {}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTransactions: null as number | null,
    totalRevenue: null as number | null,
    totalEscrow: null as number | null,
    pendingPayments: null as number | null,
    completedPayments: null as number | null,
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
        const response = await fetch("/api/admin/transactions", { cache: "no-store" })
        const result = await response.json()
        if (result?.success && result?.stats) {
          setStats({
            totalTransactions: result.stats.totalTransactions == null ? null : Number(result.stats.totalTransactions),
            totalRevenue: result.stats.totalRevenue == null ? null : Number(result.stats.totalRevenue),
            totalEscrow: result.stats.totalEscrow == null ? null : Number(result.stats.totalEscrow),
            pendingPayments: result.stats.pendingPayments == null ? null : Number(result.stats.pendingPayments),
            completedPayments: result.stats.completedPayments == null ? null : Number(result.stats.completedPayments),
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
      { icon: CreditCard, label: "Transactions", value: stats.totalTransactions == null ? "Unavailable" : String(stats.totalTransactions) },
      { icon: CircleDollarSign, label: "Recognized Revenue", value: stats.totalRevenue == null ? "Unavailable" : formatCurrency(stats.totalRevenue, "USD") },
      { icon: Wallet, label: "Trade Protection Pool", value: stats.totalEscrow == null ? "Unavailable" : formatCurrency(stats.totalEscrow, "USD") },
      { icon: Clock4, label: "Pending Payments", value: stats.pendingPayments == null ? "Unavailable" : String(stats.pendingPayments) },
    ],
    [stats],
  )

  if (!authorized) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!embedded ? (
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
            <button
              onClick={() => router.push("/admin/bigcat")}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-semibold">Orchid Admin</h1>
            <span className="text-xs text-muted-foreground">Payments</span>
          </div>
        </header>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Orchid Payment Operations</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor cross-border settlements and Trade Protection status. Escrow integration remains modular for Orchid API onboarding.
          </p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <card.icon className="w-4 h-4 text-primary mb-2" />
              <p className="text-lg font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-2">Trade Protection Module</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Payment Status tracking is active.</li>
            <li>Merchant Verification hooks are active.</li>
            <li>Shipment Progress hooks are active.</li>
            <li>Buyer Protection Status is visible for post-payment workflows.</li>
          </ul>
        </section>

        {loading ? <p className="text-sm text-muted-foreground">Refreshing Orchid metrics...</p> : null}
      </main>
    </div>
  )
}
