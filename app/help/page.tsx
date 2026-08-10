'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, ChevronUp, Search, ShoppingBag, Store, CreditCard,
  Shield, Package, Star, AlertCircle, MessageSquare, ArrowLeft,
  Truck, Users
} from 'lucide-react'

const CATEGORIES = [
  {
    id: 'buying',
    label: 'Buying',
    icon: ShoppingBag,
    color: '#dc2626',
    description: 'Orders, products & delivery',
    faqs: [
      { q: 'How do I place an order?', a: 'Browse products on the marketplace, tap "Add to Cart", proceed to checkout. Choose your delivery address, payment method, and confirm.' },
      { q: 'What payment methods are accepted?', a: 'Orchid wallet, bank transfer, and card payments. All payments are protected by escrow — funds only release to the merchant after you confirm delivery.' },
      { q: 'Can I track my order?', a: 'Yes. Go to your Orders tab. Each order shows its stage: Pending → Accepted → Verified → Packed → Transit → Delivered.' },
      { q: 'What if I receive a wrong or damaged item?', a: 'Do NOT mark the order as delivered. Open a dispute from order details within 48 hours. Escrow stays locked during investigation.' },
      { q: 'Can I follow a merchant?', a: 'Yes. Open a merchant profile and tap Follow. You receive notifications for new products and promotions from that merchant.' },
      { q: 'How does AI translation help me?', a: 'Products listed in Chinese are automatically translated to English and vice versa. Descriptions, specs and pricing are all localized.' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments & Escrow',
    icon: CreditCard,
    color: '#7c3aed',
    description: 'Wallets, escrow & refunds',
    faqs: [
      { q: 'How does escrow work?', a: 'When you pay, funds are held in escrow — not released to the merchant until you mark the order delivered or 48 hours pass.' },
      { q: 'What currencies does the wallet support?', a: 'NGN, USD and CNY. Convert between them before checkout to lock the exchange rate and eliminate FX risk during transit.' },
      { q: 'What is the 1.5% GIT fee?', a: 'Goods in Transit fee covers damage during shipping. Calculated on product price (not delivery fees) and shown in your checkout breakdown.' },
      { q: 'How long does a refund take?', a: 'Refunds for disputes resolved in your favour are processed within 3–5 business days to your wallet or original payment method.' },
      { q: 'Is my payment information secure?', a: 'Yes. BigCat does not store card or bank details. All transactions run through Orchid\'s secure payment infrastructure.' },
      { q: 'How do coupons and promotions work?', a: 'Merchants can run flash sales and issue coupon codes. Promotions apply automatically at checkout when eligible.' },
    ],
  },
  {
    id: 'selling',
    label: 'Selling',
    icon: Store,
    color: '#0ea5e9',
    description: 'Merchant accounts & payouts',
    faqs: [
      { q: 'How do I become a merchant?', a: 'Sign up as a merchant, complete onboarding, and submit business verification. Nigeria merchants provide CAC, Government ID and BVN. China merchants use the Chinese Business Verification module.' },
      { q: 'How do I get paid for my sales?', a: 'Once a buyer confirms delivery (or 48 hours pass), the amount minus platform fees is credited to your merchant wallet. Withdraw via your dashboard — minimum ₦1,000, 2.5% processing fee.' },
      { q: 'What are merchant tokens?', a: 'Credits that power your store activity. Each order charges a small number of tokens. Top up from your dashboard anytime.' },
      { q: 'Can I offer both products and services?', a: 'Yes. BigCat supports physical products, digital products and service bookings — all from your merchant dashboard.' },
      { q: 'How does AI translate my listings?', a: 'Product titles, descriptions and specs are automatically translated into the buyer\'s language. No extra setup required.' },
      { q: 'What happens after a buyer places an order?', a: 'You get an in-app notification. Accept the order, then upload packaging photos, product photos and a verification video before shipping.' },
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics',
    icon: Truck,
    color: '#f59e0b',
    description: 'Shipping, tracking & delivery',
    faqs: [
      { q: 'How is delivery fee calculated?', a: 'Based on order weight and delivery state. Express delivery costs more than standard. Fees are shown at checkout before payment.' },
      { q: 'What is the difference between delivery and pickup?', a: 'Delivery ships to your address. Pickup means you collect from a merchant location or logistics point — usually cheaper.' },
      { q: 'Can I change my delivery address after ordering?', a: 'No. Verify your address carefully before checkout. Address changes after payment are not allowed.' },
      { q: 'How are cross-border shipments handled?', a: 'BigCat partners with verified freight and clearing agents who handle export, customs, international shipping, import clearance and last-mile delivery.' },
      { q: 'What happens if my shipment is delayed at customs?', a: 'Your order status updates at every stage including customs clearance. Escrow remains locked until the issue is resolved or the order is delivered.' },
    ],
  },
  {
    id: 'safety',
    label: 'Trust & Safety',
    icon: Shield,
    color: '#10b981',
    description: 'Disputes, protection & policies',
    faqs: [
      { q: 'How do I file a dispute?', a: 'Go to the affected order, tap "Report Issue", describe the problem and submit. Escrow freezes immediately and stays locked until resolved.' },
      { q: 'What happens during a dispute?', a: 'Escrow is frozen. BigCat admin reviews both sides, requests evidence, and makes a decision within 5–7 business days. Funds then release accordingly.' },
      { q: 'What is the return goods policy?', a: 'If you receive a wrong, damaged or counterfeit item, open a dispute within 48 hours. Submit photos as evidence. BigCat reviews and authorizes a return or refund where applicable.' },
      { q: 'What is the strike system?', a: 'Users who violate platform policies (contact sharing, fraud, policy abuse) receive strikes. Three strikes can result in account suspension.' },
      { q: 'How does BigCat prevent fraud?', a: 'Escrow payments, merchant identity verification, AI-powered chat monitoring to prevent contact bypass, and an automated trust & safety system.' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: Star,
    color: '#ec4899',
    description: 'Settings, login & profile',
    faqs: [
      { q: 'How do I reset my password?', a: 'On the login screen, tap "Forgot Password" and enter your email. You will receive a reset link to your registered email.' },
      { q: 'Can I have both a buyer and merchant account?', a: 'Yes, but they require separate email addresses. Create both under different emails.' },
      { q: 'How do I delete my account?', a: 'Go to Settings → Account → Delete Account. This cancels pending orders and forfeits unclaimed wallet balance. This action is irreversible.' },
      { q: 'How do I update my store or profile?', a: 'Merchants can update their store logo, description, city and other details from Store Settings in the merchant dashboard.' },
    ],
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left group"
      >
        <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors leading-relaxed">{q}</span>
        <span className="flex-shrink-0 mt-0.5">
          {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </span>
      </button>
      {open && <p className="text-sm text-gray-400 pb-5 leading-relaxed">{a}</p>}
    </div>
  )
}

export default function HelpCenterPage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = query.trim()
    ? CATEGORIES.map((cat) => ({
        ...cat,
        faqs: cat.faqs.filter(
          (item) =>
            item.q.toLowerCase().includes(query.toLowerCase()) ||
            item.a.toLowerCase().includes(query.toLowerCase()),
        ),
      })).filter((cat) => cat.faqs.length > 0)
    : activeCategory
    ? CATEGORIES.filter((c) => c.id === activeCategory)
    : CATEGORIES

  return (
    <div className="min-h-screen bg-[#14060a]">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-white/[0.06] py-16 px-5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20"
            style={{ background: "radial-gradient(ellipse, #dc2626, transparent 70%)" }} />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to BigCat
          </Link>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "#dc262618", border: "1.5px solid #dc262640" }}>
            <AlertCircle className="w-6 h-6 text-[#dc2626]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">Help Center</h1>
          <p className="text-gray-400 text-lg mb-10">Find answers about trading, payments, and everything BigCat.</p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search for help…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveCategory(null) }}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-gray-600 outline-none focus:border-white/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-12">
        {/* Category filters */}
        {!query.trim() && (
          <div className="flex flex-wrap gap-2 mb-10">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!activeCategory ? 'bg-[#dc2626] text-white' : 'bg-white/[0.05] text-gray-400 hover:text-white border border-white/[0.06]'}`}
            >
              All Topics
            </button>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(isActive ? null : cat.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all border"
                  style={{
                    background: isActive ? `${cat.color}18` : 'transparent',
                    borderColor: isActive ? `${cat.color}50` : 'rgba(255,255,255,0.06)',
                    color: isActive ? cat.color : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              )
            })}
          </div>
        )}

        {/* FAQ Results */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-10 h-10 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-base mb-2">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-gray-600 text-sm">Try different keywords or{' '}
              <Link href="/contact" className="text-[#dc2626] hover:underline">contact support</Link>
            </p>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((cat) => {
            const Icon = cat.icon
            return (
              <div key={cat.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.04]">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cat.color}18`, border: `1.5px solid ${cat.color}30` }}>
                    <Icon className="w-4 h-4" style={{ color: cat.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{cat.label}</p>
                    <p className="text-gray-600 text-xs">{cat.description}</p>
                  </div>
                </div>
                <div className="px-6">
                  {cat.faqs.map((item) => (
                    <FaqItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Journey links */}
        {!query.trim() && !activeCategory && (
          <div className="mt-10 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8">
            <h3 className="text-lg font-extrabold text-white mb-1">Understand Your Journey</h3>
            <p className="text-gray-500 text-sm mb-6">See exactly how BigCat works for your role — step by step.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Buyer Journey", color: "#dc2626", icon: ShoppingBag },
                { label: "Merchant Journey", color: "#7c3aed", icon: Store },
                { label: "Factory Journey", color: "#0ea5e9", icon: Users },
                { label: "Freight Journey", color: "#f59e0b", icon: Truck },
              ].map((j) => {
                const Icon = j.icon
                return (
                  <Link key={j.label} href="/"
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04] transition-all text-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${j.color}15` }}>
                      <Icon className="w-4 h-4" style={{ color: j.color }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-400">{j.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-6 rounded-3xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, #dc262612, #7c3aed0a)", border: "1px solid rgba(220,38,38,0.15)" }}>
          <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: "#dc2626" }} />
          <h3 className="font-extrabold text-white mb-2">Still need help?</h3>
          <p className="text-gray-500 text-sm mb-6">Support is available Monday – Saturday, 8am – 8pm WAT.</p>
          <Link href="/contact"
            className="inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#ef4444] text-white text-sm font-bold px-8 py-3 rounded-full transition-all">
            Contact Support
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 flex-wrap text-xs text-gray-600 pb-8">
          <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-gray-400 transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  )
}
