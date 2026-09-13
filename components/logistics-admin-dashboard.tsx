"use client"
import { UiText, UiValue, UiAttributes } from "@/components/ui-language"


import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock3, Globe2, ShipWheel, ShieldCheck, Truck } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"

type LogisticsOrder = {
  id: string
  status: string
  logistics_status: string
  delivery_fee?: number
  grand_total?: number
  created_at?: string
  delivery_address?: string
  assigned_at?: string | null
  completed_at?: string | null
}

type LogisticsAdminDashboardProps = {
  embedded?: boolean
}

function mapCustomsStatus(logisticsStatus: string) { return String(logisticsStatus || 'pending').replaceAll('_', ' ') }

export function LogisticsAdminDashboard({ embedded = false }: LogisticsAdminDashboardProps = {}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<LogisticsOrder[]>([])

  useEffect(() => {
    fetch('/api/admin/session', { cache: 'no-store' }).then(r => r.json()).then(result => {
      if (result.scope === 'bigcat' || result.scope === 'trade-logistics') setAuthorized(true)
      else router.replace('/admin-portal')
    }).catch(() => router.replace('/admin-portal'))
  }, [router])

  useEffect(() => {
    if (!authorized) return
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/logistics/orders", {
          cache: "no-store",
        })
        const result = await response.json()
        const nextOrders = Array.isArray(result?.data?.orders) ? result.data.orders : []
        setOrders(nextOrders)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authorized])

  const summary = useMemo(() => {
    const totalFreight = orders.reduce((sum, item) => sum + Number(item.delivery_fee || 0), 0)
    const active = orders.filter((item) => ["assigned", "in_transit", "return_assigned", "return_in_transit"].includes(String(item.logistics_status || "").toLowerCase())).length
    const completed = orders.filter((item) => ["completed", "return_completed"].includes(String(item.logistics_status || "").toLowerCase())).length
    return { totalFreight, active, completed, total: orders.length }
  }, [orders])

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
              <ArrowLeft className="w-4 h-4" /> {" "}<UiText text={"Back"} />{" "}</button>
            <h1 className="font-semibold"><UiText text={"Trade & Logistics Admin"} /></h1>
            <span className="text-xs text-muted-foreground"><UiText text={"Global Shipments"} /></span>
          </div>
        </header>
      ) : null}

      <div className="px-4 pt-3 text-right"><button className="text-sm text-muted-foreground" onClick={async () => { const response = await fetch('/api/admin/session', { method: 'DELETE' }); if (response.ok) window.location.assign('/admin-portal') }}><UiText text={"End admin session"} /></button></div>
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Globe2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold"><UiText text={"International Trade & Logistics"} /></h2>
          </div>
          <p className="text-sm text-muted-foreground">
            <UiText text={"Manage freight workflows, shipment milestones, and delivery timelines for Nigeria-China orders."} />{" "}</p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <Truck className="w-4 h-4 text-primary mb-2" />
            <p className="text-lg font-bold">{summary.active}</p>
            <p className="text-xs text-muted-foreground"><UiText text={"Active Shipments"} /></p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <ShipWheel className="w-4 h-4 text-primary mb-2" />
            <p className="text-lg font-bold">{summary.completed}</p>
            <p className="text-xs text-muted-foreground"><UiText text={"Completed Shipments"} /></p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <Clock3 className="w-4 h-4 text-primary mb-2" />
            <p className="text-lg font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground"><UiText text={"Total Orders"} /></p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <ShieldCheck className="w-4 h-4 text-primary mb-2" />
            <p className="text-lg font-bold">{formatCurrency(summary.totalFreight, "NGN")}</p>
            <p className="text-xs text-muted-foreground"><UiText text={"Freight Cost"} /></p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold"><UiText text={"Shipment Milestones"} /></h3>
          </div>
          <div className="divide-y divide-border">
            {orders.slice(0, 20).map((order) => (
              <div key={order.id} className="p-4 grid md:grid-cols-5 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground"><UiText text={"Order"} /></p>
                  <p className="font-medium">{String(order.id).slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground"><UiText text={"Shipment Status"} /></p>
                  <p>{mapCustomsStatus(order.logistics_status)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground"><UiText text={"Shipment Tracking"} /></p>
                  <p><UiValue value={String(order.logistics_status || "pending").replace(/_/g, " ")} /></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground"><UiText text={"Estimated Delivery"} /></p>
                  <p><UiValue value={order.completed_at ? "Delivered" : "7-21 business days"} /></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground"><UiText text={"Freight Cost"} /></p>
                  <p>{formatCurrency(Number(order.delivery_fee || 0), "NGN")}</p>
                </div>
              </div>
            ))}
            {!loading && orders.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground"><UiText text={"No shipments available yet."} /></p>
            ) : null}
          </div>
        </section>

        {loading ? <p className="text-sm text-muted-foreground"><UiText text={"Refreshing shipment timeline..."} /></p> : null}
      </main>
    </div>
  )
}
