"use client"

import { useState } from "react"
import Image from "next/image"
import { ShoppingBag, Store, ArrowRight } from "lucide-react"
import { BuyerAuth } from "./buyer-auth"
import { MerchantAuth } from "./merchant-auth"

type AuthType = "buyer" | "merchant" | null

const roles = [
  {
    id: "buyer" as AuthType,
    title: "Buyer",
    description: "Browse products, make purchases, and track orders",
    icon: ShoppingBag,
  },
  {
    id: "merchant" as AuthType,
    title: "Merchant",
    description: "Sell products, manage inventory, and view analytics",
    icon: Store,
  },
]

export function Onboarding({ onGuestBrowse }: { onGuestBrowse?: () => void } = {}) {
  const [selectedAuth, setSelectedAuth] = useState<AuthType>(null)

  // Show buyer auth if selected (only when no guest browse available)
  if (selectedAuth === "buyer") {
    return <BuyerAuth onBack={() => setSelectedAuth(null)} />
  }

  // Show merchant auth if selected
  if (selectedAuth === "merchant") {
    return (
      <MerchantAuth
        onBack={() => setSelectedAuth(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Logos */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center bg-gray-900 rounded-2xl px-6 py-3 mb-4 shadow-md">
            <Image
              src="/image.png"
              alt="BigCat Global logo"
              width={72}
              height={72}
              className="object-contain"
              priority
            />
          </div>

          {/* Secondary partners */}
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
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Welcome to BigCat Global
          </h1>
          <p className="text-muted-foreground mt-2 text-pretty">
            Start cross-border trade between Nigeria and China
          </p>
        </div>

        {/* Role Selection */}
        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedAuth(role.id)}
              className="group flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-sm transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <role.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-foreground">{role.title}</h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>

        {onGuestBrowse && (
          <button
            type="button"
            onClick={onGuestBrowse}
            className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            Browse as guest
          </button>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>{' '}and{' '}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
