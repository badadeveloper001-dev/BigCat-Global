"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import {
  ArrowRight,
  ChevronDown,
  Shield,
  Zap,
  Globe,
  Lock,
  Package,
  Truck,
  ShoppingBag,
  Store,
  Building2,
  Anchor,
  MapPin,
  Eye,
  Wallet,
  CheckCircle,
  CheckCircle2,
  FileText,
  Upload,
  Globe as GlobeIcon,
  RefreshCw,
  AlertTriangle,
  Phone,
  Camera,
  BarChart3,
  Users,
  Mail,
  Hand,
  Wrench,
} from "lucide-react"
import { useRole } from "@/lib/role-context"

type ExperienceType = "buyer" | "merchant" | "factory" | "freight" | null

const experiences = [
  {
    id: "buyer",
    title: "I am a Buyer",
    subtitle: "Discover products from Nigeria & China",
    gradient: "from-[#dc2626] to-[#ef4444]",
    icon: ShoppingBag,
  },
  {
    id: "merchant",
    title: "I am a Merchant",
    subtitle: "Reach global customers",
    gradient: "from-violet-500 to-purple-400",
    icon: Store,
  },
  {
    id: "factory",
    title: "I am a Factory",
    subtitle: "Wholesale to global buyers",
    gradient: "from-sky-500 to-blue-400",
    icon: Building2,
  },
  {
    id: "freight",
    title: "I am Freight & Clearing",
    subtitle: "Handle logistics & customs",
    gradient: "from-orange-500 to-amber-400",
    icon: Truck,
  },
]

// Hero Section
function HeroSection() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-[#14060a] pt-20 px-5 flex items-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[#dc2626]/15 rounded-full blur-[150px]" />
        <div className="absolute top-40 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold text-white leading-[0.95] tracking-tight mb-6">
              Trade
              <br />
              Globally.
              <br />
              <span className="bg-gradient-to-r from-[#f87171] via-[#fb923c] to-[#fecaca] bg-clip-text text-transparent">
                Sell Without
                <br />
                Borders.
              </span>
            </h1>

            <p className="text-gray-300/90 text-lg sm:text-xl max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed">
              Buy and sell seamlessly between Nigeria and China with AI-powered translation, secure international payments, and trusted cross-border logistics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start justify-center lg:justify-start">
              <Link
                href="/marketplace"
                className="group inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#ef4444] text-white text-base font-bold px-10 py-5 rounded-full shadow-2xl shadow-black/40 transition-all hover:-translate-y-1"
              >
                Start Trading
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/auth/signup?role=merchant"
                className="inline-flex items-center gap-2 text-gray-200 hover:text-white text-base font-semibold px-8 py-5 rounded-full border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1"
              >
                Become a Merchant
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right: Animated Flow */}
          <div className="hidden lg:flex items-center justify-center relative h-[500px]">
            <svg width="100%" height="100%" viewBox="0 0 400 500" fill="none" className="w-full">
              {/* Nigeria Circle */}
              <circle cx="100" cy="80" r="50" fill="#dc2626" opacity="0.15" />
              <circle cx="100" cy="80" r="50" fill="none" stroke="#dc2626" strokeWidth="2" opacity="0.5" />
              <text x="100" y="90" textAnchor="middle" fill="#dc2626" fontSize="24" fontWeight="bold" opacity="0.8">
                NG
              </text>

              {/* Center: BigCat - Subtle Pulse */}
              <g>
                <circle cx="200" cy="250" r="60" fill="#dc2626" opacity="0.15" />
                <circle cx="200" cy="250" r="60" fill="none" stroke="#dc2626" strokeWidth="2" opacity="0.8" />
                <circle cx="200" cy="250" r="50" fill="#dc2626" opacity="0.5" />
              </g>

              {/* China Circle */}
              <circle cx="300" cy="420" r="50" fill="#dc2626" opacity="0.15" />
              <circle cx="300" cy="420" r="50" fill="none" stroke="#dc2626" strokeWidth="2" opacity="0.5" />
              <text x="300" y="430" textAnchor="middle" fill="#dc2626" fontSize="24" fontWeight="bold" opacity="0.8">
                CN
              </text>

              {/* Flow Lines - Subtle */}
              <g stroke="#f87171" strokeWidth="2" opacity="0.4">
                <path d="M 100 140 L 200 200" strokeLinecap="round" />
                <path d="M 300 200 L 200 260" strokeLinecap="round" />
              </g>

              {/* Flow Elements - Subtle movement */}
              <circle cx="130" cy="140" r="6" fill="#fb923c" opacity="0.6" />
              <circle cx="150" cy="160" r="6" fill="#fb923c" opacity="0.4" />
              <circle cx="270" cy="260" r="6" fill="#f87171" opacity="0.6" />
              <circle cx="250" cy="280" r="6" fill="#f87171" opacity="0.4" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}

// Experience Selection Section
function ExperienceSection() {
  const [selected, setSelected] = useState<ExperienceType>(null)

  if (selected) {
    return <JourneyVisualization selected={selected} onBack={() => setSelected(null)} />
  }

  return (
    <section className="py-32 px-5 bg-white/[0.02] border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-extrabold text-white mb-4 leading-tight">
            How will you use
            <br />
            <span className="bg-gradient-to-r from-[#f87171] to-[#fb923c] bg-clip-text text-transparent">
              BigCat Global?
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Choose your experience and discover your unique journey.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {experiences.map((exp) => {
            const IconComponent = exp.icon
            return (
              <button
                key={exp.id}
                onClick={() => setSelected(exp.id as ExperienceType)}
                className="group relative overflow-hidden rounded-[32px] p-8 text-left transition-all hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${exp.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="absolute inset-0 border border-white/15 group-hover:border-white/30 rounded-[32px] transition-colors" />

                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br p-3 mb-6" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}>
                    <IconComponent className="w-full h-full text-white opacity-80" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{exp.title}</h3>
                  <p className="text-gray-400 mb-6">{exp.subtitle}</p>
                  <div className="inline-flex items-center gap-2 text-[#f87171] font-semibold">
                    View Journey
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// Journey Visualization Component
function JourneyVisualization({ selected, onBack }: { selected: ExperienceType; onBack: () => void }) {
  const journeys = {
    buyer: {
      title: "I'm a Buyer",
      color: "#dc2626",
      steps: [
        { number: "1", title: "Choose Location", subtitle: "Nigeria or China", icon: MapPin },
        { number: "2", title: "Browse Products", subtitle: "Explore verified sellers", icon: Eye },
        { number: "3", title: "AI Translation", subtitle: "Content in your language", icon: Zap },
        { number: "4", title: "Fund Wallet", subtitle: "NGN • USD • CNY", icon: Wallet },
        { number: "5", title: "Secure Payment", subtitle: "Via Orchid Protection", icon: Lock },
        { number: "6", title: "Verify Evidence", subtitle: "Photos • Video proof", icon: CheckCircle2 },
        { number: "7", title: "Shipment Begins", subtitle: "Live tracking", icon: Package },
        { number: "8", title: "Receive Product", subtitle: "At your location", icon: Truck },
        { number: "9", title: "Confirm Delivery", subtitle: "Escrow releases", icon: CheckCircle },
      ],
    },
    merchant: {
      title: "I'm a Merchant",
      color: "#a855f7",
      steps: [
        { number: "1", title: "Choose Country", subtitle: "Nigeria or China", icon: GlobeIcon },
        { number: "2", title: "Business Verification", subtitle: "CAC or Chinese ID", icon: FileText },
        { number: "3", title: "Create Store", subtitle: "Your digital storefront", icon: Store },
        { number: "4", title: "Upload Products", subtitle: "Unlimited listings", icon: Upload },
        { number: "5", title: "Auto Translation", subtitle: "AI handles it all", icon: Zap },
        { number: "6", title: "Receive Orders", subtitle: "From global buyers", icon: ShoppingBag },
        { number: "7", title: "Upload Verification", subtitle: "Photos & video proof", icon: CheckCircle2 },
        { number: "8", title: "Ship Products", subtitle: "Arrange logistics", icon: Package },
        { number: "9", title: "Receive Payment", subtitle: "After delivery confirmed", icon: Wallet },
      ],
    },
    factory: {
      title: "I'm a Factory",
      color: "#0ea5e9",
      steps: [
        { number: "1", title: "Choose Country", subtitle: "Nigeria or China", icon: Globe },
        { number: "2", title: "Business Verification", subtitle: "Factory credentials", icon: FileText },
        { number: "3", title: "Factory Profile", subtitle: "Showcase capabilities", icon: Building2 },
        { number: "4", title: "Bulk Listings", subtitle: "Wholesale pricing", icon: Package },
        { number: "5", title: "Global Buyers", subtitle: "B2B connections", icon: Users },
        { number: "6", title: "International Trade", subtitle: "Large orders", icon: GlobeIcon },
        { number: "7", title: "Receive Payments", subtitle: "Secure & fast", icon: Wallet },
      ],
    },
    freight: {
      title: "I'm a Freight & Clearing Agent",
      color: "#f97316",
      steps: [
        { number: "1", title: "Company Profile", subtitle: "Register your logistics firm", icon: Building2 },
        { number: "2", title: "Receive Requests", subtitle: "Shipment opportunities", icon: Phone },
        { number: "3", title: "Accept Jobs", subtitle: "Bid and confirm", icon: CheckCircle2 },
        { number: "4", title: "Handle Services", subtitle: "Export • Import • Customs • Warehousing", icon: Truck },
        { number: "5", title: "Update Milestones", subtitle: "Real-time tracking", icon: MapPin },
        { number: "6", title: "Receive Payments", subtitle: "For completed logistics", icon: Wallet },
      ],
    },
  }

  const journey = selected ? journeys[selected] : null

  if (!journey) {
    return <div>Loading...</div>
  }

  return (
    <section className="min-h-screen bg-[#14060a] py-20 px-5">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-12 inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
          Back
        </button>

        <h2 className="text-5xl sm:text-6xl font-extrabold text-white mb-4">{journey.title}</h2>
        <p className="text-gray-400 text-lg mb-16">
          Discover your complete journey on BigCat Global, step by step.
        </p>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting Line */}
          <div
            className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-[#dc2626] via-[#f87171] to-[#fecaca]"
            style={{ opacity: 0.3 }}
          />

          {/* Steps */}
          <div className="space-y-12">
            {journey.steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <div key={step.number} className="relative pl-24">
                  {/* Step Circle */}
                  <div
                    className="absolute left-0 w-16 h-16 rounded-full flex items-center justify-center border-4 border-[#14060a] text-white"
                    style={{
                      background: journey.color,
                      opacity: 0.8,
                      boxShadow: `0 0 20px ${journey.color}40`,
                    }}
                  >
                    <StepIcon className="w-7 h-7" />
                  </div>

                  {/* Content Card */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:bg-white/[0.08] transition-all">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-500">Step {step.number}</span>
                      {index < journey.steps.length - 1 && (
                        <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-gray-400">{step.subtitle}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-gray-400 mb-6">Ready to start your journey?</p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#ef4444] text-white font-bold px-10 py-4 rounded-full transition-all hover:-translate-y-1 shadow-lg shadow-black/30"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// Why BigCat Global Section
function WhySection() {
  const reasons = [
    {
      title: "AI Translation",
      description: "Automatic real-time translation for products and messages",
      icon: Zap,
      gradient: "from-violet-500 to-purple-400",
    },
    {
      title: "Multi-Currency Wallet",
      description: "Hold and convert between NGN, USD, and CNY instantly",
      icon: Wallet,
      gradient: "from-sky-500 to-blue-400",
    },
    {
      title: "International Logistics",
      description: "Trusted clearing agents and real-time shipment tracking",
      icon: Truck,
      gradient: "from-orange-500 to-amber-400",
    },
    {
      title: "Secure Orchid Payments",
      description: "Escrow protection until verified delivery",
      icon: Lock,
      gradient: "from-emerald-500 to-green-400",
    },
  ]

  return (
    <section className="py-32 px-5 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-extrabold text-white mb-4">
            Why
            <br />
            <span className="bg-gradient-to-r from-[#f87171] to-[#fb923c] bg-clip-text text-transparent">
              BigCat Global?
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {reasons.map((reason) => {
            const ReasonIcon = reason.icon
            return (
              <div
                key={reason.title}
                className="group relative rounded-[32px] p-10 overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${reason.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br p-3 mb-6" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}>
                    <ReasonIcon className="w-full h-full text-white opacity-80" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{reason.title}</h3>
                  <p className="text-gray-400">{reason.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// Supported Countries Section
function CountriesSection() {
  return (
    <section className="py-32 px-5">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-5xl font-extrabold text-white mb-6">Supported Countries</h2>
        <p className="text-gray-400 text-lg mb-16">Starting with the world's largest trade corridors</p>

        <div className="flex justify-center gap-12 mb-12">
          <div className="text-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#dc2626] to-[#ef4444] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-5xl font-bold text-white">NG</span>
            </div>
            <p className="text-white font-bold text-xl">Nigeria</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-5xl font-bold text-white">CN</span>
            </div>
            <p className="text-white font-bold text-xl">China</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] py-8 px-6">
          <p className="text-gray-400">More countries coming soon</p>
        </div>
      </div>
    </section>
  )
}

// Order Protection Section
function ProtectionSection() {
  return (
    <section className="py-32 px-5 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-5xl font-extrabold text-white mb-20 text-center">Order Protection</h2>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Goods in Transit */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-10 hover:bg-white/[0.08] transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#dc2626]/20 flex items-center justify-center mb-6">
              <Package className="w-6 h-6 text-[#f87171]" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-6">Goods in Transit Protection</h3>

            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <Truck className="w-5 h-5 text-[#fb923c] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">Merchant → Shipment → Tracking → Delivery</p>
                  <p className="text-gray-400 text-sm mt-1">Full journey coverage</p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <p className="text-gray-400 text-sm font-semibold mb-3">PROTECTS AGAINST:</p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#f87171] rounded-full" /> Lost Shipment
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#f87171] rounded-full" /> Transit Damage
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#f87171] rounded-full" /> Logistics Failure
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#f87171] rounded-full" /> Customs Delay
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl bg-[#dc2626]/10 border border-[#dc2626]/20 p-4">
              <p className="text-sm text-gray-300">Escrow remains locked during investigation</p>
            </div>
          </div>

          {/* Return Goods */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-10 hover:bg-white/[0.08] transition-all">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-6">
              <RefreshCw className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-6">Return Goods Policy</h3>

            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">Delivered → Issue → Evidence → Resolution</p>
                  <p className="text-gray-400 text-sm mt-1">5-step review process</p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <p className="text-gray-400 text-sm font-semibold mb-3">APPLICABLE FOR:</p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" /> Wrong Item
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" /> Damaged Goods
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" /> Counterfeit Products
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" /> Missing Items
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
              <p className="text-sm text-gray-300">Refund or replacement guaranteed</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Order Timeline Section
function OrderTimelineSection() {
  const stages = [
    { label: "Order Placed", icon: ShoppingBag, color: "#dc2626" },
    { label: "Merchant Accepted", icon: Hand, color: "#f87171" },
    { label: "Verification Uploaded", icon: CheckCircle2, color: "#fb923c" },
    { label: "Packed", icon: Package, color: "#fbbf24" },
    { label: "Export Clearance", icon: FileText, color: "#a3e635" },
    { label: "International Transit", icon: Truck, color: "#22d3ee" },
    { label: "Import Clearance", icon: Building2, color: "#8b5cf6" },
    { label: "Out For Delivery", icon: MapPin, color: "#ec4899" },
    { label: "Delivered", icon: CheckCircle, color: "#10b981" },
  ]

  return (
    <section className="py-32 px-5 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-extrabold text-white mb-4">Order Timeline</h2>
          <p className="text-gray-400 text-lg">Every stage, beautifully tracked</p>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 overflow-x-auto">
          <div className="flex gap-4 min-w-min pb-4">
            {stages.map((stage, index) => {
              const StageIcon = stage.icon
              return (
                <div key={stage.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-4 border-4 border-[#14060a] shadow-lg text-white"
                      style={{ background: stage.color, opacity: 0.85 }}
                    >
                      <StageIcon className="w-8 h-8" />
                    </div>
                    <p className="text-white text-sm font-semibold text-center whitespace-nowrap">{stage.label}</p>
                  </div>
                  {index < stages.length - 1 && <div className="w-8 h-1 bg-gradient-to-r from-white/30 to-transparent mx-2 -mt-12" />}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-6">Real-time updates at every milestone</p>
        </div>
      </div>
    </section>
  )
}

// Download Section
function DownloadSection() {
  return (
    <section className="py-32 px-5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#dc2626]/20 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="text-5xl font-extrabold text-white mb-6">Download BigCat Global</h2>
        <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto">
          Available on iOS and Android. Trade anywhere, anytime.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-all group"
          >
            <Phone className="w-6 h-6 text-white" />
            <div className="text-left">
              <p className="text-xs text-gray-400">Download on</p>
              <p className="text-white font-bold">App Store</p>
            </div>
          </a>

          <a
            href="https://play.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-all group"
          >
            <Phone className="w-6 h-6 text-white" />
            <div className="text-left">
              <p className="text-xs text-gray-400">Get it on</p>
              <p className="text-white font-bold">Google Play</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}

// Footer
function FooterSection() {
  return (
    <footer className="border-t border-white/5 py-12 px-5">
      <div className="max-w-6xl mx-auto text-center">
        <div className="mb-8">
          <h3 className="text-white font-bold text-lg mb-2">BigCat Global</h3>
          <p className="text-gray-500 text-sm">Trade Globally. Sell Without Borders.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <Link href="/terms" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Privacy
          </Link>
          <Link href="/contact" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Contact
          </Link>
          <Link href="/help" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Help
          </Link>
        </div>

        <p className="text-gray-600 text-xs">© {new Date().getFullYear()} BigCat Global. All rights reserved.</p>
      </div>
    </footer>
  )
}

// Main Export
export function LandingPageV2() {
  return (
    <div className="min-h-screen bg-[#14060a] overflow-x-hidden">
      <HeroSection />
      <ExperienceSection />
      <WhySection />
      <CountriesSection />
      <ProtectionSection />
      <OrderTimelineSection />
      <DownloadSection />
      <FooterSection />
    </div>
  )
}
