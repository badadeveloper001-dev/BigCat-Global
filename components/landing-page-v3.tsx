"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import {
  ArrowRight, ShoppingBag, Store, Building2, Truck, Package, Wallet,
  CheckCircle2, MapPin, FileText, Zap, Lock, RefreshCw, AlertTriangle,
  Users, Shield, Globe, ChevronLeft, Star, Clock, CreditCard,
  BarChart3, Camera, Upload, Search, Heart, TrendingUp, Box,
  Navigation, Anchor
} from "lucide-react"

/* ─── Types ─────────────────────────────────────────────── */
type Role = "buyer" | "merchant" | "factory" | "freight" | null

/* ─── Data ───────────────────────────────────────────────── */
const ROLES = [
  {
    id: "buyer" as const,
    label: "I am a Buyer",
    sub: "Discover & order products from Nigeria & China",
    color: "#dc2626",
    bg: "from-red-600/20 to-red-500/5",
    border: "border-red-500/30 hover:border-red-500/60",
    icon: ShoppingBag,
    emoji: "🛍️",
  },
  {
    id: "merchant" as const,
    label: "I am a Merchant",
    sub: "Sell your products to global buyers",
    color: "#7c3aed",
    bg: "from-violet-600/20 to-violet-500/5",
    border: "border-violet-500/30 hover:border-violet-500/60",
    icon: Store,
    emoji: "🏪",
  },
  {
    id: "factory" as const,
    label: "I am a Factory",
    sub: "Wholesale to international buyers",
    color: "#0ea5e9",
    bg: "from-sky-600/20 to-sky-500/5",
    border: "border-sky-500/30 hover:border-sky-500/60",
    icon: Building2,
    emoji: "🏭",
  },
  {
    id: "freight" as const,
    label: "I am Freight & Clearing",
    sub: "Handle logistics & customs globally",
    color: "#f59e0b",
    bg: "from-amber-600/20 to-amber-500/5",
    border: "border-amber-500/30 hover:border-amber-500/60",
    icon: Truck,
    emoji: "🚢",
  },
]

const BUYER_STEPS = [
  { icon: MapPin, label: "Choose Location", detail: "Nigeria or China", color: "#dc2626" },
  { icon: Search, label: "Browse Products", detail: "Thousands of verified listings", color: "#ef4444" },
  { icon: Globe, label: "AI Translation", detail: "Products auto-translated to your language", color: "#f97316" },
  { icon: Wallet, label: "Fund Your Wallet", detail: "NGN · USD · CNY — lock FX before checkout", color: "#eab308" },
  { icon: Lock, label: "Secure Payment via Orchid", detail: "Funds held in escrow until delivery", color: "#22c55e" },
  { icon: Camera, label: "Merchant Verification", detail: "Photos · Packaging · Video proof", color: "#06b6d4" },
  { icon: Package, label: "Shipment Begins", detail: "Real-time tracking milestones", color: "#3b82f6" },
  { icon: Navigation, label: "Receive Product", detail: "Delivered to your address", color: "#8b5cf6" },
  { icon: CheckCircle2, label: "Confirm & Release", detail: "Escrow releases payment to merchant", color: "#10b981" },
]

const MERCHANT_STEPS = [
  { icon: MapPin, label: "Choose Country", detail: "Nigeria or China", color: "#7c3aed" },
  { icon: Shield, label: "Business Verification", detail: "CAC · SMEDAN · Government ID", color: "#8b5cf6" },
  { icon: Store, label: "Create Your Store", detail: "Brand page, logo, description", color: "#a855f7" },
  { icon: Upload, label: "Upload Products", detail: "Photos, pricing, inventory", color: "#c084fc" },
  { icon: Globe, label: "AI Translates Listings", detail: "Reach buyers in any language instantly", color: "#e879f9" },
  { icon: ShoppingBag, label: "Receive Orders", detail: "Notifications for every new order", color: "#f0abfc" },
  { icon: Camera, label: "Upload Proof", detail: "Packaging · Product · Verification video", color: "#7c3aed" },
  { icon: Truck, label: "Ship Product", detail: "Choose your logistics partner", color: "#6d28d9" },
  { icon: CreditCard, label: "Receive Payment", detail: "Funds released after buyer confirms", color: "#4c1d95" },
]

const FACTORY_STEPS = [
  { icon: MapPin, label: "Choose Country", detail: "Nigeria or China", color: "#0ea5e9" },
  { icon: Shield, label: "Business Verification", detail: "Factory credentials & license", color: "#38bdf8" },
  { icon: Building2, label: "Create Factory Profile", detail: "Capabilities, MOQ, certifications", color: "#7dd3fc" },
  { icon: Box, label: "Wholesale Listings", detail: "Products with bulk pricing tiers", color: "#0369a1" },
  { icon: TrendingUp, label: "Bulk Pricing", detail: "Set price breaks for volume orders", color: "#0284c7" },
  { icon: Users, label: "Global Buyers Find You", detail: "B2B buyers from Nigeria & beyond", color: "#0ea5e9" },
  { icon: BarChart3, label: "International Trade", detail: "Export / Import with documentation", color: "#38bdf8" },
  { icon: CreditCard, label: "Receive Payments", detail: "Secure cross-border settlements", color: "#7dd3fc" },
]

const FREIGHT_STEPS = [
  { icon: Building2, label: "Create Company Profile", detail: "Credentials, coverage, specialization", color: "#f59e0b" },
  { icon: ShoppingBag, label: "Receive Shipment Requests", detail: "Matched to your region & expertise", color: "#fbbf24" },
  { icon: CheckCircle2, label: "Accept Logistics Jobs", detail: "Bid or direct-assign contracts", color: "#fcd34d" },
  { icon: Package, label: "Handle Export", detail: "Documentation, customs exit", color: "#fde68a" },
  { icon: Anchor, label: "International Shipping", detail: "Air, sea, road — full visibility", color: "#f59e0b" },
  { icon: Shield, label: "Import & Customs", detail: "Clearance, warehousing, last mile", color: "#fbbf24" },
  { icon: Navigation, label: "Update Milestones", detail: "Real-time shipment status updates", color: "#fcd34d" },
  { icon: CreditCard, label: "Receive Payments", detail: "Settled after milestone confirmation", color: "#fde68a" },
]

const WHY_BLOCKS = [
  {
    icon: Globe,
    title: "AI Translation",
    detail: "Product listings auto-translated between English, Yoruba, Hausa, Igbo, Mandarin and more.",
    color: "#dc2626",
  },
  {
    icon: Wallet,
    title: "Multi-Currency Wallet",
    detail: "Hold NGN, USD and CNY. Lock exchange rates before checkout to eliminate FX risk.",
    color: "#7c3aed",
  },
  {
    icon: Truck,
    title: "International Logistics",
    detail: "Verified freight agents handle export, customs, international shipping and last-mile delivery.",
    color: "#0ea5e9",
  },
  {
    icon: Lock,
    title: "Orchid Escrow Payments",
    detail: "Funds locked in escrow until buyer confirms delivery. No trust required — only verification.",
    color: "#10b981",
  },
]

const ORDER_STAGES = [
  { label: "Order Placed", icon: ShoppingBag },
  { label: "Merchant Accepted", icon: Store },
  { label: "Verification Uploaded", icon: Camera },
  { label: "Packed", icon: Box },
  { label: "Export Clearance", icon: FileText },
  { label: "International Transit", icon: Globe },
  { label: "Import Clearance", icon: Shield },
  { label: "Out for Delivery", icon: Navigation },
  { label: "Delivered", icon: CheckCircle2 },
]

/* ─── Atoms ──────────────────────────────────────────────── */
function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: pulse ? `0 0 0 4px ${color}33` : undefined }}
    />
  )
}

function AnimatedLine({ active }: { active: boolean }) {
  return (
    <div className="w-px flex-1 mx-auto overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div
        className="w-full transition-all duration-700"
        style={{ background: "linear-gradient(to bottom, #dc2626, transparent)", height: active ? "100%" : "0%" }}
      />
    </div>
  )
}

function NigeriaFlag() {
  return (
    <svg viewBox="0 0 3 2" className="h-9 w-12 sm:h-11 sm:w-16 rounded-md shadow-lg shadow-black/10 overflow-hidden" aria-label="Nigeria flag">
      <rect width="3" height="2" fill="#008753" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#008753" />
    </svg>
  )
}

function ChinaFlag() {
  return (
    <svg viewBox="0 0 3 2" className="h-9 w-12 sm:h-11 sm:w-16 rounded-md shadow-lg shadow-black/10 overflow-hidden" aria-label="China flag">
      <rect width="3" height="2" fill="#de2910" />
      <g transform="translate(0.75 0.55) scale(0.24)">
        <polygon points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309" fill="#ffde00" />
      </g>
      <g transform="translate(1.3 0.38) scale(0.11)">
        <polygon points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309" fill="#ffde00" />
      </g>
      <g transform="translate(1.55 0.72) scale(0.09)">
        <polygon points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309" fill="#ffde00" />
      </g>
      <g transform="translate(1.38 0.95) scale(0.07)">
        <polygon points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309" fill="#ffde00" />
      </g>
      <g transform="translate(1.68 0.9) scale(0.07)">
        <polygon points="0,-1 0.2245,-0.309 0.9511,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.9511,-0.309 -0.2245,-0.309" fill="#ffde00" />
      </g>
    </svg>
  )
}

/* ─── Journey Timeline ───────────────────────────────────── */
function JourneyTimeline({
  steps,
  heading,
  sub,
  accent,
}: {
  steps: typeof BUYER_STEPS
  heading: string
  sub: string
  accent: string
}) {
  const [active, setActive] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActive((a) => (a + 1) % steps.length)
    }, 2000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [steps.length])

  return (
    <div className="py-8 px-4 max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h3 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">{heading}</h3>
        <p className="text-white/75 text-base">{sub}</p>
      </div>

      <div className="relative">
        {/* Vertical rail */}
        <div className="absolute left-[22px] top-0 bottom-0 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        <div className="space-y-1">
          {steps.map((step, i) => {
            const isActive = i === active
            const isPast = i < active
            const Icon = step.icon

            return (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="relative flex items-start gap-5 w-full text-left group"
              >
                {/* Step dot */}
                <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full border-2 transition-all duration-500"
                  style={{
                    borderColor: isActive ? step.color : isPast ? `${step.color}60` : "rgba(255,255,255,0.1)",
                    background: isActive ? `${step.color}20` : isPast ? `${step.color}10` : "transparent",
                  }}>
                  <Icon className="w-4 h-4 transition-all duration-500" style={{ color: isActive ? step.color : isPast ? `${step.color}80` : "rgba(255,255,255,0.3)" }} />
                </div>

                {/* Content */}
                <div className={`py-2.5 flex-1 transition-all duration-500 pb-8 ${isActive ? "opacity-100" : isPast ? "opacity-60" : "opacity-30"}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: isActive ? step.color : "rgba(255,255,255,0.3)" }}>
                      Step {i + 1}
                    </span>
                    {isActive && <Dot color={step.color} pulse />}
                  </div>
                  <p className="font-bold text-lg text-white leading-tight">{step.label}</p>
                  {isActive && (
                    <p className="text-white/75 text-sm mt-1 animate-in fade-in duration-300">{step.detail}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Sections ───────────────────────────────────────────── */

function HeroSection() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 3000)
    return () => clearInterval(t)
  }, [])

  const flowItems = [
    { label: "Service Booking", y: 0.25 },
    { label: "Secure Payment", y: 0.5 },
    { label: "Delivery / Completion", y: 0.75 },
  ]

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#8d0909] flex items-center pt-16 text-white">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20 blur-[180px]"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.24), transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 blur-[120px]"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.16), transparent 70%)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-5 gap-12 items-center py-20">
        {/* Left: Copy — spans 3 cols */}
        <div className="lg:col-span-3 text-center lg:text-left">
          <div className="mb-7 flex items-center justify-center lg:justify-start gap-4 sm:gap-6">
            <div className="shrink-0 rounded-full bg-white/10 p-1.5 backdrop-blur-sm">
              <ChinaFlag />
            </div>
            <div className="w-[160px] sm:w-[220px] drop-shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
              <Image
                src="/bigcat-logo-transparent.png"
                alt="BigCat Global"
                width={640}
                height={420}
                priority
                className="h-auto w-full object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div className="shrink-0 rounded-full bg-white/10 p-1.5 backdrop-blur-sm">
              <NigeriaFlag />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/30 bg-white/10 text-white text-xs font-medium mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Trusted cross-border trade
          </div>

          <h1 className="text-[clamp(3rem,8vw,6rem)] font-black text-white leading-[0.9] tracking-tighter mb-8">
            Trade
            <br />
            Globally.
            <br />
            <span className="text-white/90">
              Sell Without
              <br />
              Borders.
            </span>
          </h1>

          <p className="text-white/85 text-lg sm:text-xl max-w-lg mx-auto lg:mx-0 mb-6 leading-relaxed">
            Discover trusted services, book with confidence, and trade across Nigeria and China with
            AI-powered translation, secure payments, and verified logistics.
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-2 text-sm font-medium text-white">
              <Lock className="w-4 h-4" />
              100% Escrow Protected
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-medium text-white">
              <Shield className="w-4 h-4 text-white" />
              Buyer & seller protection
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link
              href="/marketplace?view=services"
              className="group inline-flex items-center justify-center gap-2 bg-white hover:bg-[#fff0f0] text-[#d94a4a] text-base font-bold px-10 py-4 rounded-full shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              Explore Services
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 text-white hover:text-white/80 text-base font-semibold px-8 py-4 rounded-full border border-white/30 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5"
            >
              Browse Marketplace
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 flex items-center gap-8 justify-center lg:justify-start">
            {[
              { val: "2", unit: "Countries", sub: "NG + CN" },
              { val: "100%", unit: "Escrow", sub: "Protected" },
              { val: "AI", unit: "Translation", sub: "Built in" },
            ].map((s) => (
              <div key={s.unit} className="text-center lg:text-left">
                <div className="text-2xl font-black text-white">{s.val}</div>
                <div className="text-xs text-white/80 font-medium">{s.unit}</div>
                <div className="text-xs text-white/60">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Flow Diagram — spans 2 cols */}
        <div className="hidden lg:block lg:col-span-2 relative h-[520px]">
          <svg className="w-full h-full" viewBox="0 0 300 520" fill="none">
            {/* Nigeria */}
            <g>
              <circle cx="150" cy="65" r="52" fill="#dc2626" fillOpacity="0.08" />
              <circle cx="150" cy="65" r="52" stroke="#dc2626" strokeWidth="1.5" strokeOpacity="0.4" />
              <circle cx="150" cy="65" r="38" fill="#dc2626" fillOpacity="0.12" />
              <g transform="translate(106 33)">
                <rect width="88" height="58" rx="16" fill="rgba(255,255,255,0.1)" />
                <rect x="10" y="10" width="68" height="38" fill="#008753" />
                <rect x="42" y="10" width="14" height="38" fill="#fff" />
                <rect x="10" y="10" width="32" height="38" fill="#008753" />
                <rect x="46" y="10" width="32" height="38" fill="#008753" />
              </g>
            </g>

            {/* Connector NG → Hub */}
            <line x1="150" y1="117" x2="150" y2="195" stroke="#dc2626" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="4 4" />
            {[0.3, 0.6].map((p, i) => (
              <circle key={i} cx="150" cy={117 + (195 - 117) * p} r="4" fill="#fb923c" fillOpacity={0.7 - i * 0.2}>
                <animate attributeName="cy" values={`${117 + (195 - 117) * p};${117 + (195 - 117) * (p + 0.15)};${117 + (195 - 117) * p}`}
                  dur={`${1.5 + i * 0.4}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* BigCat Hub */}
            <circle cx="150" cy="260" r="58" fill="#dc2626" fillOpacity="0.15" />
            <circle cx="150" cy="260" r="58" stroke="#dc2626" strokeWidth="2" strokeOpacity="0.7" />
            <circle cx="150" cy="260" r="44" fill="#dc2626" fillOpacity="0.2" />
            <text x="150" y="252" textAnchor="middle" fill="white" fontSize="11" fontWeight="800" letterSpacing="1">BIGCAT</text>
            <text x="150" y="268" textAnchor="middle" fill="white" fontSize="9" opacity="0.6">GLOBAL</text>
            <circle cx="150" cy="260" r="56">
              <animate attributeName="r" values="56;60;56" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
            </circle>

            {/* Connector Hub → CN */}
            <line x1="150" y1="318" x2="150" y2="396" stroke="#dc2626" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="4 4" />
            {[0.3, 0.6].map((p, i) => (
              <circle key={i} cx="150" cy={318 + (396 - 318) * p} r="4" fill="#60a5fa" fillOpacity={0.7 - i * 0.2}>
                <animate attributeName="cy" values={`${318 + (396 - 318) * p};${318 + (396 - 318) * (p + 0.15)};${318 + (396 - 318) * p}`}
                  dur={`${1.5 + i * 0.4}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* China */}
            <g>
              <circle cx="150" cy="455" r="52" fill="#1d4ed8" fillOpacity="0.08" />
              <circle cx="150" cy="455" r="52" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.4" />
              <circle cx="150" cy="455" r="38" fill="#1d4ed8" fillOpacity="0.12" />
              <g transform="translate(106 425)">
                <rect width="88" height="58" rx="16" fill="rgba(255,255,255,0.1)" />
                <rect x="10" y="10" width="68" height="38" fill="#de2910" />
                <g transform="translate(32 18) scale(0.6)">
                  <polygon points="0,-10 2.2,-3.1 9.5,-3.1 3.6,1.2 5.8,8 0,3.8 -5.8,8 -3.6,1.2 -9.5,-3.1 -2.2,-3.1" fill="#ffde00" />
                </g>
              </g>
            </g>

            {/* Flow labels on the side */}
            {[
              { y: 156, text: "Orders & Payments", color: "#f87171" },
              { y: 350, text: "Goods & Logistics", color: "#60a5fa" },
            ].map((l) => (
              <g key={l.y}>
                <rect x="170" y={l.y - 10} width="110" height="20" rx="10" fill="white" fillOpacity="0.04" />
                <text x="225" y={l.y + 4} textAnchor="middle" fill={l.color} fontSize="8.5" fontWeight="600" opacity="0.8">{l.text}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(182, 13, 13, 0.7))" }} />
    </section>
  )
}

function ExperienceSection() {
  const [selected, setSelected] = useState<Role>(null)

  const stepsMap: Record<NonNullable<Role>, typeof BUYER_STEPS> = {
    buyer: BUYER_STEPS,
    merchant: MERCHANT_STEPS,
    factory: FACTORY_STEPS,
    freight: FREIGHT_STEPS,
  }

  const metaMap: Record<NonNullable<Role>, { heading: string; sub: string; accent: string }> = {
    buyer: { heading: "I'm a Buyer", sub: "Your end-to-end shopping journey", accent: "#dc2626" },
    merchant: { heading: "I'm a Merchant", sub: "From verification to your first sale", accent: "#7c3aed" },
    factory: { heading: "I'm a Factory", sub: "Wholesale B2B trade made global", accent: "#0ea5e9" },
    freight: { heading: "I'm a Freight Agent", sub: "Handle shipments, earn at every milestone", accent: "#f59e0b" },
  }

  if (selected) {
    return (
      <section className="min-h-screen bg-[#8d0909] py-16 px-5 text-white">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-10 text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to all experiences
          </button>

          <JourneyTimeline
            steps={stepsMap[selected]}
            heading={metaMap[selected].heading}
            sub={metaMap[selected].sub}
            accent={metaMap[selected].accent}
          />

          <div className="mt-12 text-center">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#ef4444] text-white font-bold px-10 py-4 rounded-full shadow-xl shadow-red-900/30 transition-all hover:-translate-y-0.5"
            >
              {selected === "buyer" ? "Start Browsing" : "Get Started"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-28 px-5 bg-[#8d0909] border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-white/80 text-sm font-bold uppercase tracking-[0.2em] mb-4">Your Experience</p>
          <h2 className="text-[clamp(2.2rem,6vw,4.5rem)] font-black text-white leading-tight">
            How will you use
            <br />
            <span className="text-white/90">
              BigCat Global?
            </span>
          </h2>
          <p className="text-white/80 mt-5 text-lg max-w-md mx-auto">
            Pick your role to see your complete journey — step by step.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {ROLES.map((role) => {
            const Icon = role.icon
            return (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                className={`group relative overflow-hidden rounded-3xl p-8 text-left transition-all duration-300 bg-gradient-to-br ${role.bg} border ${role.border} hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `${role.color}20`, border: `1.5px solid ${role.color}40` }}>
                    <Icon className="w-6 h-6" style={{ color: role.color }} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#5f4b46] group-hover:text-[#1f1412] group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <h3 className="text-2xl font-extrabold text-[#1f1412] mb-2">{role.label}</h3>
                <p className="text-[#5f4b46] text-sm leading-relaxed">{role.sub}</p>

                <div className="mt-6 flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ color: role.color, background: `${role.color}15` }}>
                    See my journey →
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function WhySection() {
  return (
    <section className="py-28 px-5 relative overflow-hidden" style={{ background: "linear-gradient(to bottom, #fff5f5, #fff1f2)" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[120px]"
          style={{ background: "radial-gradient(ellipse, #dc262620, transparent 70%)" }} />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#FF0000] text-sm font-bold uppercase tracking-[0.2em] mb-4">Built Different</p>
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-black text-[#1f1412]">Why BigCat Global?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {WHY_BLOCKS.map((b) => {
            const Icon = b.icon
            return (
              <div key={b.title}
                className="group relative overflow-hidden rounded-3xl p-8 border border-red-100 bg-[#fff8f8] hover:bg-[#fff1f1] transition-all duration-300">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-10 transition-opacity group-hover:opacity-20"
                  style={{ background: b.color }} />

                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: `${b.color}18`, border: `1.5px solid ${b.color}30` }}>
                    <Icon className="w-5 h-5" style={{ color: b.color }} />
                  </div>
                  <h3 className="text-xl font-extrabold text-[#1f1412] mb-3">{b.title}</h3>
                  <p className="text-[#5f4b46] text-sm leading-relaxed">{b.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function CountriesSection() {
  return (
    <section className="py-28 px-5 bg-[#fffaf7]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#FF0000] text-sm font-bold uppercase tracking-[0.2em] mb-4">Coverage</p>
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-black text-[#1f1412]">Supported Countries</h2>
          <p className="text-[#5f4b46] mt-4 text-lg">Two powerhouse economies. One marketplace.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {[
            {
              flag: "🇳🇬", name: "Nigeria", role: "West Africa's largest economy",
              items: ["Buyers", "Merchants", "Factories", "Freight Agents"],
              color: "#22c55e",
            },
            {
              flag: "🇨🇳", name: "China", role: "World's manufacturing hub",
              items: ["Suppliers", "Factories", "Export Houses", "Freight Agents"],
              color: "#ef4444",
            },
          ].map((c) => (
            <div key={c.name}
              className="relative overflow-hidden rounded-3xl p-10 border border-red-100 bg-[#fff8f8]">
              <div className="absolute top-4 right-4 text-6xl opacity-15">{c.flag}</div>
              <div className="text-5xl mb-4">{c.flag}</div>
              <h3 className="text-3xl font-black text-[#1f1412] mb-1">{c.name}</h3>
              <p className="text-[#5f4b46] text-sm mb-6">{c.role}</p>
              <div className="flex flex-wrap gap-2">
                {c.items.map((item) => (
                  <span key={item} className="text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{ color: c.color, background: `${c.color}15`, border: `1px solid ${c.color}25` }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center py-6 rounded-2xl border border-dashed border-[#f2d7d0] text-[#5f4b46] text-sm">
          🌍 &nbsp; More countries coming soon — UK, UAE, Ghana and beyond
        </div>
      </div>
    </section>
  )
}

function ProtectionSection() {
  const cards = [
    {
      title: "Goods in Transit Protection",
      icon: Shield,
      color: "#10b981",
      badge: "GIT Coverage",
      flow: ["Merchant Ships", "In Transit", "Tracked", "Delivered"],
      covers: ["Lost Shipment", "Transit Damage", "Logistics Failure", "Customs Delay"],
      note: "Escrow remains locked during investigation. 1.5% GIT fee applies.",
    },
    {
      title: "Return Goods Policy",
      icon: RefreshCw,
      color: "#f59e0b",
      badge: "Buyer Protection",
      flow: ["Delivered", "Buyer Reports", "Evidence Reviewed", "Resolved"],
      covers: ["Wrong Item", "Damaged Goods", "Counterfeit Products", "Missing Items"],
      note: "Open a dispute within 48 hours of delivery.",
    },
  ]

  return (
    <section className="py-28 px-5" style={{ background: "linear-gradient(to bottom, #fff5f5, #fff1f2)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#FF0000] text-sm font-bold uppercase tracking-[0.2em] mb-4">Order Protection</p>
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-black text-[#1f1412]">You're covered.</h2>
          <p className="text-[#5f4b46] mt-4 text-lg max-w-md mx-auto">
            Every transaction on BigCat is protected end-to-end.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title}
                className="relative overflow-hidden rounded-3xl p-8 border border-red-100 bg-[#fff8f8]">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-[0.07]"
                  style={{ background: card.color }} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: `${card.color}18`, border: `1.5px solid ${card.color}30` }}>
                      <Icon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                      style={{ color: card.color, background: `${card.color}15` }}>
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#1f1412] mb-5">{card.title}</h3>

                  {/* Flow */}
                  <div className="flex items-center gap-1 mb-6 overflow-x-auto">
                    {card.flow.map((step, i) => (
                      <div key={step} className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#fff1ee] text-[#4b3b37]">{step}</span>
                        {i < card.flow.length - 1 && <span className="text-gray-700 text-xs">→</span>}
                      </div>
                    ))}
                  </div>

                  {/* Covers */}
                  <div className="space-y-2 mb-5">
                    {card.covers.map((item) => (
                      <div key={item} className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: card.color }} />
                        <span className="text-[#5f4b46] text-sm">{item}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[#6b514e] text-xs border-t border-[#f2d7d0] pt-4">{card.note}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function OrderTimelineSection() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % ORDER_STAGES.length), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="py-28 px-5 bg-[#fff2f2]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#FF0000] text-sm font-bold uppercase tracking-[0.2em] mb-4">Order Journey</p>
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-black text-[#1f1412]">Every stage. Tracked.</h2>
          <p className="text-[#5f4b46] mt-4">Real-time milestones from order to delivery.</p>
        </div>

        <div className="relative">
          {/* Horizontal scroll on mobile, wrap on desktop */}
          <div className="flex gap-2 overflow-x-auto pb-6 lg:flex-wrap lg:justify-center">
            {ORDER_STAGES.map((stage, i) => {
              const Icon = stage.icon
              const isDone = i < active
              const isCurrent = i === active
              return (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-500"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2"
                    style={{
                      borderColor: isCurrent ? "#dc2626" : isDone ? "#dc262660" : "rgba(255,255,255,0.08)",
                      background: isCurrent ? "#FF000010" : isDone ? "#FF000008" : "transparent",
                    }}>
                    <Icon className="w-4 h-4 transition-all duration-500"
                      style={{ color: isCurrent ? "#FF0000" : isDone ? "#FF000070" : "rgba(255,255,255,0.2)" }} />
                  </div>
                  <span className="text-xs text-center w-16 leading-tight transition-all duration-500"
                    style={{ color: isCurrent ? "white" : isDone ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)" }}>
                    {stage.label}
                  </span>
                  {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-[#FF0000] animate-pulse" />}
                </button>
              )
            })}
          </div>

          {/* Active stage detail */}
          <div className="mt-8 text-center p-8 rounded-3xl border border-red-100 bg-[#fff8f8]">
            <div className="text-sm text-[#5f4b46] mb-1">Currently at stage {active + 1} of {ORDER_STAGES.length}</div>
            <div className="text-2xl font-black text-[#1f1412]">{ORDER_STAGES[active].label}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FooterSection() {
  return (
    <footer className="border-t border-red-100 bg-[#fff2f2] py-16 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-14">
          <div className="col-span-2 sm:col-span-1">
            <div className="text-xl font-black text-[#1f1412] mb-3">BigCat Global</div>
            <p className="text-[#5f4b46] text-sm leading-relaxed">
              Trade between Nigeria and China — powered by AI, secured by escrow.
            </p>
          </div>

          {[
            { label: "Platform", links: [{ name: "Marketplace", href: "/marketplace" }, { name: "Help & FAQ", href: "/help" }, { name: "Logistics", href: "/logistics" }] },
            { label: "Legal", links: [{ name: "Terms of Service", href: "/terms" }, { name: "Privacy Policy", href: "/privacy" }] },
            { label: "Company", links: [{ name: "Contact", href: "/contact" }, { name: "Become a Merchant", href: "/marketplace" }] },
          ].map((col) => (
            <div key={col.label}>
              <p className="text-[#1f1412] font-bold text-sm mb-4">{col.label}</p>
              <div className="space-y-3">
                {col.links.map((l) => (
                  <Link key={l.name} href={l.href} className="block text-[#5f4b46] hover:text-[#1f1412] text-sm transition-colors">{l.name}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-red-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#5f4b46] text-xs">© 2026 BigCat Global. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs text-[#5f4b46]">
            <Shield className="w-3.5 h-3.5" />
            Protected by Orchid Escrow
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ─── Main Export ────────────────────────────────────────── */
export function LandingPageV3() {
  return (
    <div className="min-h-screen bg-[#fff2f2] overflow-x-hidden text-[#1f1412]">
      <HeroSection />
      <ExperienceSection />
      <WhySection />
      <CountriesSection />
      <ProtectionSection />
      <OrderTimelineSection />
      <FooterSection />
    </div>
  )
}
