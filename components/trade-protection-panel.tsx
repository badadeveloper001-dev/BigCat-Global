"use client"

import { CheckCircle2, Clock3, ShieldCheck, ShipWheel } from "lucide-react"

type TradeOrder = {
  id?: string
  payment_status?: string
  verification_status?: string
  logistics_status?: string
  status?: string
  created_at?: string
}

function normalize(value?: string) {
  return String(value || "").trim().toLowerCase()
}

function toLabel(value?: string) {
  const normalized = normalize(value)
  if (!normalized) return "Pending"
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase())
}

function mapBuyerProtectionStatus(order: TradeOrder) {
  const payment = normalize(order.payment_status)
  const logistics = normalize(order.logistics_status || order.status)

  if (payment === "completed" && ["completed", "delivered", "return_completed"].includes(logistics)) {
    return "Protected and Complete"
  }

  if (payment === "completed") return "Protected in Transit"
  return "Protected - Payment Pending"
}

export function TradeProtectionPanel({
  title = "Trade Protection",
  orders,
}: {
  title?: string
  orders: TradeOrder[]
}) {
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>

      {orders.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No protected orders yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {orders.slice(0, 6).map((order) => (
            <div key={String(order.id || Math.random())} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Order {String(order.id || "").slice(0, 8) || "Pending"}</p>
                <p className="text-xs text-muted-foreground">{order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-secondary/50 p-2">
                  <p className="text-muted-foreground">Payment Status</p>
                  <p className="font-medium text-foreground flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> {toLabel(order.payment_status)}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <p className="text-muted-foreground">Merchant Verification</p>
                  <p className="font-medium text-foreground flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {toLabel(order.verification_status || "pending_review")}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <p className="text-muted-foreground">Shipment Progress</p>
                  <p className="font-medium text-foreground flex items-center gap-1"><ShipWheel className="w-3.5 h-3.5" /> {toLabel(order.logistics_status || order.status)}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <p className="text-muted-foreground">Buyer Protection</p>
                  <p className="font-medium text-foreground flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> {mapBuyerProtectionStatus(order)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
