"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ShoppingBag,
  Brain,
  CreditCard,
  Building2,
  ArrowRight,
  Star,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Package,
  ChevronRight,
  Smartphone,
} from "lucide-react"

const categories = [
  "Trade Without Borders", "Shop from China", "Export from Nigeria", "Featured Global Merchants",
  "Trending Imports", "Trending Exports", "Industrial Supplies", "Consumer Electronics",
  "AI Trade Assistant", "Cross-Border Services", "Wholesale Deals", "Verified Suppliers",
]

const stats = [
  { value: "50K+", label: "Verified Merchants", icon: Users },
  { value: "200K+", label: "Cross-Border Listings", icon: Package },
  { value: "$120M+", label: "Trade Volume Processed", icon: TrendingUp },
  { value: "4.8★", label: "Trade Confidence Score", icon: Star },
]

const features = [
  {
    icon: ShoppingBag,
    title: "Global Supplier Marketplace",
    description: "Discover trusted suppliers across Nigeria and China with AI-powered discovery and multilingual search.",
    gradient: "from-[#00A651] to-[#45c76c]",
    bg: "bg-[#06521c]/40",
    border: "border-[#0b772a]/50",
    glow: "shadow-[#06521c]/60",
  },
  {
    icon: Brain,
    title: "AI Trade Assistant",
    description: "Translate listings, estimate freight, explain customs, and guide import/export decisions in real time.",
    gradient: "from-violet-500 to-purple-400",
    bg: "bg-violet-950/50",
    border: "border-violet-800/40",
    glow: "shadow-violet-900/40",
  },
  {
    icon: Shield,
    title: "Trade Protection",
    description: "Track payment status, merchant verification, shipment progress, and buyer protection in one place.",
    gradient: "from-sky-500 to-blue-400",
    bg: "bg-sky-950/50",
    border: "border-sky-800/40",
    glow: "shadow-sky-900/40",
  },
  {
    icon: Building2,
    title: "International Verification",
    description: "Support for CAC and identity verification in Nigeria plus Chinese Business Verification onboarding.",
    gradient: "from-orange-500 to-amber-400",
    bg: "bg-orange-950/50",
    border: "border-orange-800/40",
    glow: "shadow-orange-900/40",
  },
]

const steps = [
  {
    number: "01",
    title: "Create Your Account",
    description: "Sign up in under 2 minutes as a buyer or merchant. No paperwork, no hassle.",
    color: "bg-[#00A651]",
    textColor: "text-[#45c76c]",
  },
  {
    number: "02",
    title: "Get Verified",
    description: "Complete merchant verification workflows for cross-border trust and payment readiness.",
    color: "bg-violet-400",
    textColor: "text-violet-400",
  },
  {
    number: "03",
    title: "Start Cross-Border Trading",
    description: "Source from China, export from Nigeria, and manage international catalogs in one workflow.",
    color: "bg-sky-400",
    textColor: "text-sky-400",
  },
  {
    number: "04",
    title: "Scale with AI",
    description: "Use AI-powered supplier discovery, translation, and trade insights to grow global revenue.",
    color: "bg-orange-400",
    textColor: "text-orange-400",
  },
]

const testimonials = [
  {
    name: "Amara Obi",
    role: "Fashion Exporter, Lagos",
    quote: "BigCat Global helped us source materials from China and sell faster across borders with less friction.",
    rating: 5,
    avatar: "AO",
  },
  {
    name: "Chukwuemeka Nwosu",
    role: "Electronics Importer, Abuja",
    quote: "The Trade Protection workflow and shipment milestones gave our buyers confidence on every international order.",
    rating: 5,
    avatar: "CN",
  },
  {
    name: "Fatimah Bello",
    role: "Agribusiness Merchant, Kano",
    quote: "The AI translation and supplier recommendations opened new sourcing channels we could not reach before.",
    rating: 5,
    avatar: "FB",
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#032c0e] font-sans overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-[#032c0e]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white p-1.5 shadow-lg shadow-black/30 ring-1 ring-black/5 overflow-hidden">
              <Image src="/image.png" alt="BigCat" width={36} height={36} className="w-full h-full object-cover object-top rounded-xl" />
            </div>
            <span className="font-extrabold text-white text-lg tracking-tight">BigCat Global</span>
            <span className="hidden sm:block text-[10px] font-semibold text-[#45c76c] bg-[#00A651]/10 border border-[#00A651]/30 px-2 py-0.5 rounded-full uppercase tracking-widest ml-1">
              International
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/marketplace"
              className="hidden sm:block text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              Browse
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 bg-[#00A651] hover:bg-[#17bd49] text-white text-sm font-semibold px-4 py-2 rounded-full transition-all shadow-lg shadow-black/30"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-14 pb-24 px-5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[980px] h-[520px] rounded-full bg-[#00A651]/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-24 right-0 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-7">
              <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
                AI-powered Nigeria-China commerce bridge
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.02] tracking-tight mb-5">
              Trade without
              <br />
              language barriers.
              <br />
              <span className="bg-gradient-to-r from-[#00A651] via-[#72d38e] to-violet-300 bg-clip-text text-transparent">
                Grow globally.
              </span>
            </h1>

            <p className="text-gray-300/90 text-lg sm:text-xl max-w-2xl lg:max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              BigCat Global is an AI-first cross-border commerce platform connecting buyers and merchants between Nigeria and China.
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-center justify-center lg:justify-start gap-4">
              <Link
                href="/marketplace"
                className="group inline-flex items-center gap-2 bg-[#00A651] hover:bg-[#17bd49] text-white text-base font-bold px-8 py-4 rounded-full shadow-2xl shadow-black/40 transition-all hover:-translate-y-0.5"
              >
                Start Selling Today
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 text-gray-200 hover:text-white text-base font-semibold px-6 py-4 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all"
              >
                <ShoppingBag className="w-4 h-4" /> Browse Products
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 text-left">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Shield className="w-4 h-4 text-[#45c76c]" /> Escrow Protected
                </div>
                <p className="text-xs text-gray-400 mt-1">Payments stay safe until delivery is confirmed.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Brain className="w-4 h-4 text-violet-300" /> AI Discovery
                </div>
                <p className="text-xs text-gray-400 mt-1">Shoppers find the right products faster.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <CreditCard className="w-4 h-4 text-sky-300" /> Fast Checkout
                </div>
                <p className="text-xs text-gray-400 mt-1">Smooth card, bank, wallet, and delivery flows.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-8">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2"
                >
                  <stat.icon className="w-3.5 h-3.5 text-[#45c76c] flex-shrink-0" />
                  <span className="text-white font-bold text-sm">{stat.value}</span>
                  <span className="text-gray-500 text-xs">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-[#00A651]/20 via-transparent to-violet-500/20 blur-2xl" />
            <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[26px] bg-[#0a1b0f]">
                <Image
                  src="/hero-marketplace.png"
                  alt="BigCat Global — Your Market. Your Culture. One Click."
                  fill
                  priority
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#03160a]/85 via-[#032c0e]/15 to-transparent" />

                <div className="absolute top-4 left-4 rounded-full border border-white/15 bg-[#032c0e]/80 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
                  Live marketplace energy ✨
                </div>

                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#72d38e]">Built for real commerce</p>
                  <p className="text-white text-lg font-bold mt-1">From neighborhood markets to nationwide growth.</p>
                  <p className="text-gray-300 text-sm mt-1">Beautiful storefronts, secure escrow, and AI tools that help merchants sell more.</p>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex absolute -left-4 top-10 rounded-2xl border border-white/10 bg-[#07120b]/90 px-4 py-3 shadow-xl backdrop-blur-md items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00A651]/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-[#72d38e]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Verified local sellers</p>
                <p className="text-gray-400 text-xs">Trusted SMEs across Nigeria</p>
              </div>
            </div>

            <div className="hidden sm:flex absolute -right-3 bottom-16 rounded-2xl border border-white/10 bg-[#07120b]/90 px-4 py-3 shadow-xl backdrop-blur-md items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">AI-powered growth</p>
                <p className="text-gray-400 text-xs">Smarter product discovery</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY MARQUEE ── */}
      <section className="py-6 border-y border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="flex gap-3 animate-[marquee_25s_linear_infinite] whitespace-nowrap w-max">
          {[...categories, ...categories].map((cat, i) => (
            <Link
              key={i}
              href="/marketplace"
              className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-[#00A651]/15 border border-white/10 hover:border-[#00A651]/40 text-gray-300 hover:text-[#45c76c] text-sm font-medium px-4 py-2 rounded-full transition-all flex-shrink-0"
            >
              <ChevronRight className="w-3 h-3 opacity-50" /> {cat}
            </Link>
          ))}
        </div>
      </section>

      {/* ── PARTNER TRUST BAR ── */}
      <section className="py-14 px-5 bg-[#032c0e]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#45c76c]/60 mb-8">
            Trusted & Backed By
          </p>
          <div className="flex items-center justify-center gap-10 sm:gap-16 flex-wrap">
            <div className="rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/90">
              Orchid Payments
            </div>
            <div className="bg-white rounded-2xl px-3 py-2 shadow-md opacity-90 hover:opacity-100 transition-opacity">
              <Image src="/image.png" alt="BigCat Global" width={72} height={36} className="object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#45c76c]">What We Offer</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-3 mb-4 leading-tight">
              One platform.<br />
              <span className="bg-gradient-to-r from-[#00A651] to-violet-400 bg-clip-text text-transparent">
                Infinite possibilities.
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Everything you need to buy, sell, scale, and succeed — built into a single smart marketplace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className={`${f.bg} ${f.border} border rounded-3xl p-7 hover:shadow-2xl ${f.glow} transition-all hover:-translate-y-1 group`}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} shadow-lg mb-5`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2.5">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
                <div className={`mt-5 inline-flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r ${f.gradient} bg-clip-text text-transparent`}>
                  Learn more <ChevronRight className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">How it works</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-3 mb-4">
              A simple flow from
              <span className="block bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                discovery to delivery
              </span>
            </h2>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4">
              {[
                {
                  title: "Discover",
                  description: "Browse verified sellers, compare products, and use AI guidance to find the right option.",
                  icon: ShoppingBag,
                  gradient: "from-[#00A651] to-[#45c76c]",
                },
                {
                  title: "Connect",
                  description: "Chat with merchants, confirm details, and move from browsing to a trusted transaction.",
                  icon: Users,
                  gradient: "from-violet-500 to-purple-400",
                },
                {
                  title: "Pay & Ship",
                  description: "Secure your order with protected payments and track delivery all in one place.",
                  icon: CreditCard,
                  gradient: "from-sky-500 to-blue-400",
                },
                {
                  title: "Grow",
                  description: "Review progress, build loyalty, and scale your business with ongoing trade insights.",
                  icon: TrendingUp,
                  gradient: "from-orange-500 to-amber-400",
                },
              ].map((step, index) => (
                <div key={step.title} className="flex-1">
                  <div className="relative h-full rounded-[24px] border border-white/10 bg-[#07120b]/90 p-5 shadow-lg shadow-black/20">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${step.gradient} shadow-lg mb-4`}>
                      <step.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#72d38e] mb-2">
                      Step {index + 1}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-400">{step.description}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden lg:flex items-center justify-center py-3 text-[#45c76c]">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[24px] border border-[#00A651]/20 bg-[#032c0e]/70 p-5 sm:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#72d38e]">Visual flow</p>
                  <p className="text-white font-semibold mt-1">Buyer → discovery → trusted checkout → delivery &amp; growth</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-300">Verified merchants</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-300">Protected payments</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-300">Live updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-5 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Merchant Stories</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 mb-4">
              Real people.{" "}
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                Real growth.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white/[0.04] border border-white/10 rounded-3xl p-7 hover:bg-white/[0.07] transition-all hover:-translate-y-1"
              >
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00A651] flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-28 px-5 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[400px] rounded-full bg-[#00A651]/20 blur-[120px]" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#00A651]/10 border border-[#00A651]/25 rounded-full px-4 py-1.5 mb-8">
            <Zap className="w-3.5 h-3.5 text-[#45c76c]" />
            <span className="text-xs font-semibold text-[#72d38e] uppercase tracking-widest">
              Join 50,000+ merchants
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Your business deserves{" "}
            <span className="bg-gradient-to-r from-[#00A651] to-[#72d38e] bg-clip-text text-transparent">
              to be seen.
            </span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
            Open your store today. It&apos;s free, fast, and backed by Nigeria&apos;s most trusted business network.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/marketplace"
              className="group inline-flex items-center gap-2 bg-[#00A651] hover:bg-[#17bd49] text-white text-base font-bold px-10 py-4 rounded-full shadow-2xl shadow-black/40 transition-all hover:-translate-y-0.5"
            >
              Open My Store Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              Or shop as a buyer
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1.5 shadow-md ring-1 ring-black/5 overflow-hidden">
              <Image src="/image.png" alt="BigCat" width={28} height={28} className="w-full h-full object-cover object-top rounded-lg" />
            </div>
            <span className="font-bold text-white text-sm">BigCat Global</span>
          </div>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link href="/marketplace" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Browse</Link>
            <Link href="/marketplace" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Sell</Link>
            <Link href="/help" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Help Center</Link>
            <Link href="/contact" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Contact</Link>
            <Link href="/terms" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Terms</Link>
            <Link href="/privacy" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Privacy</Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80">
              Orchid
            </div>
            <div className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80">
              BigCat Global
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} BigCat Global. All rights reserved.</p>
        </div>
      </footer>

      {/* Marquee animation */}
    </div>
  )
}
