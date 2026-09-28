"use client"
import { UiText, UiValue, UiAttributes } from "@/components/ui-language"


import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Wallet, Landmark, RefreshCw, ArrowDownLeft, ArrowUpRight, Plus, Trash2, CreditCard, ShoppingBag, Eye, EyeOff, Copy, Check, Building2, Send, X, Shield, Gift, BadgeCheck, Unlock, RotateCcw } from "lucide-react"
import { useRole } from "@/lib/role-context"
import { formatNaira } from "@/lib/currency-utils"
import { MerchantWithdrawal } from "@/components/merchant-withdrawal"
import { MultiCurrencyWallet } from "@/components/multi-currency-wallet"

interface PaymentMethodsPageProps {
  onBack: () => void
}

interface WalletTransactionRow {
  id: string
  order_id?: string | null
  buyer_id?: string | null
  type?: string | null
  amount?: number | null
  reason?: string | null
  status?: string | null
  created_at?: string | null
}

interface BuyerOrder {
  id: string
  status?: string | null
  grand_total?: number | null
  product_total?: number | null
  delivery_fee?: number | null
  payment_method?: string | null
  created_at?: string | null
}

interface SavedPaymentMethod {
  id: string
  type?: string | null
  details?: any
  is_default?: boolean | null
  created_at?: string | null
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000]

// Derive a stable pseudo-account number from userId
function deriveVirtualAccount(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  const base = Math.abs(hash % 900_000_000) + 100_000_000
  return String(base)
}

function BuyerWalletSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<BuyerOrder[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletTransactions, setWalletTransactions] = useState<WalletTransactionRow[]>([])
  const [walletError, setWalletError] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([])
  const [pmError, setPmError] = useState("")
  const [showAddCard, setShowAddCard] = useState(false)
  const [newMethodType, setNewMethodType] = useState("card")
  const [newMethodDetails, setNewMethodDetails] = useState("")
  const [addingMethod, setAddingMethod] = useState(false)
  const [removingId, setRemovingId] = useState("")
  const [settingDefaultId, setSettingDefaultId] = useState("")
  const [showFundWallet, setShowFundWallet] = useState(false)
  const [fundAmount, setFundAmount] = useState("5000")
  const [funding, setFunding] = useState(false)
  const [fundError, setFundError] = useState("")
  const [fundSuccess, setFundSuccess] = useState("")
  const [showAllTx, setShowAllTx] = useState(false)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [showBankModal, setShowBankModal] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [fundRef] = useState(() => `BCW-${Math.random().toString(36).slice(2, 10).toUpperCase()}`)

  const virtualAccount = deriveVirtualAccount(userId)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const loadData = async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    try {
      const [ordRes, pmRes, walletRes] = await Promise.all([
        fetch(`/api/buyer/orders?userId=${encodeURIComponent(userId)}`, { cache: "no-store" }),
        fetch(`/api/user/payment-methods?userId=${encodeURIComponent(userId)}`, { cache: "no-store" }),
        fetch(`/api/buyer/wallet?userId=${encodeURIComponent(userId)}`, { cache: "no-store" }),
      ])
      const ordData = await ordRes.json().catch(() => ({}))
      const pmData = await pmRes.json().catch(() => ({}))
      const walletData = await walletRes.json().catch(() => ({}))
      setOrders(Array.isArray(ordData?.data) ? ordData.data : Array.isArray(ordData?.orders) ? ordData.orders : [])
      setPaymentMethods(Array.isArray(pmData?.data) ? pmData.data : [])
      if (walletData?.success) {
        setWalletBalance(Number(walletData.balance || 0))
        setWalletTransactions(Array.isArray(walletData.transactions) ? walletData.transactions : [])
        setWalletError("")
        setLastRefreshed(new Date())
      } else {
        setWalletBalance(0)
        setWalletTransactions([])
        setWalletError(String(walletData?.error || 'Could not load wallet activity'))
      }
    } catch {
      setWalletBalance(0)
      setWalletTransactions([])
      setWalletError('Could not load wallet activity')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [userId])

  const handleFundWallet = async () => {
    const amount = Number(fundAmount || 0)
    if (!Number.isFinite(amount) || amount < 100) {
      setFundError('Minimum top-up is ₦100')
      return
    }
    setFunding(true)
    setFundError("")
    setFundSuccess("")
    try {
      const res = await fetch('/api/buyer/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: userId, amount, reason: `Wallet top-up – ${formatNaira(amount)}` }),
      })
      const result = await res.json()
      if (!result?.success) {
        setFundError(result?.error || 'Failed to fund wallet')
        return
      }
      setFundSuccess(`₦${amount.toLocaleString('en-NG')} added to your wallet!`)
      setFundAmount("5000")
      setShowFundWallet(false)
      await loadData()
    } catch {
      setFundError('Could not fund wallet. Please try again.')
    } finally {
      setFunding(false)
    }
  }

  const totalSpent = orders.reduce((s, o) => s + (Number(o.grand_total) || 0), 0)
  const escrowHeld = orders
    .filter(o => o.status && !['delivered','completed','cancelled'].includes(o.status))
    .reduce((s, o) => s + (Number(o.product_total) || Number(o.grand_total) || 0), 0)
  const creditTypes = new Set(["wallet_credit", "refund", "payment", "escrow_release"])
  const debitTypes = new Set(["wallet_debit", "withdrawal"])
  const refundRows = walletTransactions.filter((tx) => {
    const type = String(tx.type || '').toLowerCase().trim()
    return type === 'wallet_credit' || type === 'refund'
  })
  const totalIn = walletTransactions.reduce((sum, tx) => {
    const type = String(tx.type || '').toLowerCase().trim()
    const amt = Math.max(0, Number(tx.amount || 0))
    return creditTypes.has(type) ? sum + amt : sum
  }, 0)
  const totalOut = walletTransactions.reduce((sum, tx) => {
    const type = String(tx.type || '').toLowerCase().trim()
    const amt = Math.max(0, Number(tx.amount || 0))
    return debitTypes.has(type) ? sum + amt : sum
  }, 0)
  const visibleTx = showAllTx ? walletTransactions : walletTransactions.slice(0, 5)

  const handleAddMethod = async () => {
    if (!newMethodDetails.trim()) return
    setAddingMethod(true)
    setPmError("")
    try {
      const res = await fetch('/api/user/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, method: { type: newMethodType, details: { label: newMethodDetails.trim() } } }),
      })
      const result = await res.json()
      if (!result?.success) { setPmError(result?.error || 'Failed to add method'); return }
      setNewMethodDetails("")
      setShowAddCard(false)
      await loadData()
    } catch { setPmError('Could not add payment method.') }
    finally { setAddingMethod(false) }
  }

  const handleRemoveMethod = async (methodId: string) => {
    setRemovingId(methodId)
    try {
      await fetch(`/api/user/payment-methods?userId=${userId}&methodId=${methodId}`, { method: 'DELETE' })
      await loadData()
    } catch { /* ignore */ }
    finally { setRemovingId("") }
  }

  const handleSetDefaultMethod = async (methodId: string) => {
    setSettingDefaultId(methodId)
    setPmError("")
    try {
      const res = await fetch('/api/user/payment-methods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, methodId }),
      })
      const result = await res.json().catch(() => ({}))
      if (!result?.success) {
        setPmError(result?.error || 'Failed to set default method')
        return
      }
      await loadData()
    } catch {
      setPmError('Could not set default payment method.')
    } finally {
      setSettingDefaultId("")
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm"><UiText text={"Loading wallet..."} /></span>
      </div>
    )
  }

  return (
    <>
      {/* ── Wallet card ── */}
      {/* ── Bank Transfer Modal ── */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-center justify-center px-4 py-4 sm:py-6">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base"><UiText text={"Fund Your Wallet"} /></h3>
              <button onClick={() => setShowBankModal(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 p-4 space-y-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium uppercase tracking-wide"><UiText text={"Transfer to this account"} /></p>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground"><UiText text={"Bank Name"} /></p>
                    <p className="text-sm font-semibold"><UiText text={"Wema Bank"} /></p>
                  </div>
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground"><UiText text={"Account Number"} /></p>
                    <p className="text-lg font-bold tracking-widest">{virtualAccount}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(virtualAccount, 'account')}
                    className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 hover:bg-emerald-200 transition-colors"
                  >
                    {copiedField === 'account' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground"><UiText text={"Account Name"} /></p>
                    <p className="text-sm font-semibold"><UiText text={"BIGCAT MARKETPLACE /"} />{" "}{userId.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="h-px bg-emerald-200 dark:bg-emerald-800" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground"><UiText text={"Payment Reference"} /></p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{fundRef}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(fundRef, 'ref')}
                    className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 hover:bg-emerald-200 transition-colors"
                  >
                    {copiedField === 'ref' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              <UiText text={"Transfer any amount to the account above. Your wallet will be credited within"} />{" "}<strong><UiText text={"5 minutes"} /></strong> {" "}<UiText text={"of receiving the transfer. Always use your payment reference so we can identify your payment."} />{" "}</p>

            {/* Quick manual top-up for demo / testing */}
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"><UiText text={"Quick top-up (demo)"} /></p>
              <div className="grid grid-cols-5 gap-1.5">
                {QUICK_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setFundAmount(String(amt))}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                      fundAmount === String(amt)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {amt >= 1000 ? `₦${amt / 1000}k` : `₦${amt}`}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₦</span>
                  <UiAttributes><input
                    type="number" min="100" max="1000000"
                    value={fundAmount}
                    onChange={e => setFundAmount(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background pl-8 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                    placeholder="Custom amount"
                  /></UiAttributes>
                </div>
                <button
                  onClick={async () => { await handleFundWallet(); setShowBankModal(false) }}
                  disabled={funding}
                  className="rounded-xl bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  {funding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </button>
              </div>
              {fundError && <p className="text-xs text-red-600"><UiValue value={fundError} /></p>}
              {fundSuccess && <p className="text-xs text-emerald-600 font-medium"><UiValue value={fundSuccess} /></p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Wallet card ── */}
      <section className="rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        {/* card chip */}
        <div className="absolute top-5 right-16 w-8 h-6 rounded bg-yellow-400/60 border border-yellow-300/40 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-100" />
              <span className="text-sm font-semibold text-emerald-100 tracking-wide uppercase"><UiText text={"BigCat Wallet"} /></span>
            </div>
            <div className="flex items-center gap-2">
              <UiAttributes><button
                onClick={() => setBalanceVisible(v => !v)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
              >
                {balanceVisible ? <EyeOff className="w-3.5 h-3.5 text-white" /> : <Eye className="w-3.5 h-3.5 text-white" />}
              </button></UiAttributes>
              <UiAttributes><button
                onClick={loadData}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Refresh wallet"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white" />
              </button></UiAttributes>
            </div>
          </div>

          <p className="text-xs text-emerald-200 mb-1"><UiText text={"Available Balance"} /></p>
          <h2 className="text-4xl font-extrabold tracking-tight">
            {balanceVisible ? formatNaira(walletBalance) : '₦ ••••••'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[11px] text-emerald-300">{virtualAccount.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')} {" "}<UiText text={"· Wema Bank"} /></p>
            {lastRefreshed && (
              <p className="text-[10px] text-emerald-400/80 ml-auto">
                <UiText text={"Updated"} />{" "}{lastRefreshed.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-white/15 py-2 px-3">
              <p className="text-[11px] text-emerald-200 uppercase tracking-wide"><UiText text={"Money In"} /></p>
              <p className="text-sm font-bold">{balanceVisible ? formatNaira(totalIn) : '••••'}</p>
            </div>
            <div className="rounded-2xl bg-white/15 py-2 px-3">
              <p className="text-[11px] text-emerald-200 uppercase tracking-wide"><UiText text={"Money Out"} /></p>
              <p className="text-sm font-bold">{balanceVisible ? formatNaira(totalOut) : '••••'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick stats ── */}
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide"><UiText text={"Total Spent"} /></p>
          <p className="text-base font-bold text-foreground">{formatNaira(totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide"><UiText text={"Orders"} /></p>
          <p className="text-base font-bold text-foreground">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide"><UiText text={"In Escrow"} /></p>
          <p className="text-base font-bold text-amber-600">{formatNaira(escrowHeld)}</p>
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setShowBankModal(true); setFundError(""); setFundSuccess("") }}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-4 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300"><UiText text={"Add Money"} /></span>
        </button>
        <UiAttributes><button
          onClick={() => {}}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-muted/40 p-4 hover:bg-muted transition-colors opacity-50 cursor-not-allowed"
          title="Coming soon"
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Send className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground"><UiText text={"Send Money"} /></span>
        </button></UiAttributes>
      </section>

      {/* ── Fund wallet (legacy inline — hidden, replaced by modal) ── */}
      <section className="hidden rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><ArrowDownLeft className="w-4 h-4 text-emerald-600" /> {" "}<UiText text={"Add Money"} /></h3>
          <button
            onClick={() => { setShowFundWallet(v => !v); setFundError(""); setFundSuccess("") }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            <UiValue value={showFundWallet ? 'Cancel' : 'Top Up'} />
          </button>
        </div>

        {fundSuccess && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700 font-medium">
            <UiValue value={fundSuccess} />
          </div>
        )}

        {showFundWallet && (
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-1.5">
              {QUICK_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setFundAmount(String(amt))}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                    fundAmount === String(amt)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {amt >= 1000 ? `₦${amt / 1000}k` : `₦${amt}`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₦</span>
                <UiAttributes><input
                  type="number"
                  min="100"
                  max="1000000"
                  value={fundAmount}
                  onChange={e => setFundAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background pl-8 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                  placeholder="Custom amount"
                /></UiAttributes>
              </div>
              <button
                onClick={handleFundWallet}
                disabled={funding}
                className="rounded-xl bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {funding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </button>
            </div>
            {fundError && <p className="text-xs text-red-600"><UiValue value={fundError} /></p>}
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Landmark className="w-3 h-3" />
              <UiText text={"Funds are available instantly for checkout payments and refunds."} />{" "}</p>
          </div>
        )}
      </section>

      {/* ── Transaction history ── */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold"><UiText text={"Transaction History"} /></h3>
          {walletTransactions.length > 5 && (
            <button onClick={() => setShowAllTx(v => !v)} className="text-xs font-semibold text-primary hover:underline">
              <UiValue value={showAllTx ? 'Show less' : `See all (${walletTransactions.length})`} />
            </button>
          )}
        </div>

        {walletError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><UiValue value={walletError} /></div>
        )}

        {walletTransactions.length === 0 ? (
          <div className="rounded-xl bg-muted/50 border border-border p-4 text-sm text-muted-foreground text-center">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p><UiText text={"No transactions yet."} /></p>
            <p className="text-xs mt-1"><UiText text={"Top up your wallet or place an order to get started."} /></p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTx.map((tx) => {
              const type = String(tx.type || '').toLowerCase().trim()
              const isDebit = debitTypes.has(type)
              const amount = Math.max(0, Number(tx.amount || 0))
              const label = tx.reason || (
                type === 'wallet_credit' ? 'Wallet top-up'
                : type === 'refund' ? 'Refund credit'
                : type === 'escrow_release' ? 'Escrow released'
                : type === 'payment' ? 'Payment received'
                : type === 'wallet_debit' ? 'Wallet payment'
                : type === 'withdrawal' ? 'Withdrawal'
                : 'Wallet activity'
              )
              const txDate = tx.created_at ? new Date(tx.created_at) : null
              const iconBg = type === 'refund' ? 'bg-blue-100'
                : type === 'escrow_release' ? 'bg-emerald-100'
                : type === 'payment' ? 'bg-amber-100'
                : type === 'withdrawal' ? 'bg-orange-100'
                : isDebit ? 'bg-red-100' : 'bg-emerald-100'
              const txIcon = type === 'refund'
                ? <RotateCcw className="w-4 h-4 text-blue-600" />
                : type === 'escrow_release'
                ? <Unlock className="w-4 h-4 text-emerald-600" />
                : type === 'payment'
                ? <ShoppingBag className="w-4 h-4 text-amber-600" />
                : type === 'withdrawal'
                ? <Send className="w-4 h-4 text-orange-500" />
                : isDebit
                ? <ArrowUpRight className="w-4 h-4 text-red-600" />
                : <ArrowDownLeft className="w-4 h-4 text-emerald-600" />

              return (
                <div key={tx.id} className="rounded-xl border border-border bg-background px-3 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                    {txIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate"><UiValue value={label} /></p>
                    <p className="text-xs text-muted-foreground">
                      {txDate ? txDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      {tx.order_id ? ` · #${String(tx.order_id).slice(0, 8).toUpperCase()}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isDebit ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isDebit ? '−' : '+'}{formatNaira(amount)}
                    </p>
                    <p className={`text-[10px] font-medium uppercase ${tx.status === 'completed' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {tx.status || 'completed'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {refundRows.length > 0 && (
          <p className="text-xs text-emerald-700 flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3" />
            {refundRows.length} {" "}<UiText text={"refund credit"} />{refundRows.length !== 1 ? 's' : ''} {" "}<UiText text={"received"} />{" "}</p>
        )}
      </section>

      {/* ── Saved payment methods ── */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" /> {" "}<UiText text={"Saved Payment Methods"} /></h3>
          <button
            onClick={() => setShowAddCard(v => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> {" "}<UiText text={"Add"} />{" "}</button>
        </div>

        {showAddCard && (
          <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2">
            <select
              value={newMethodType}
              onChange={e => setNewMethodType(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="card"><UiText text={"Debit / Credit Card"} /></option>
              <option value="bank_transfer"><UiText text={"Bank Transfer"} /></option>
              <option value="orchid"><UiText text={"Orchid"} /></option>
              <option value="opay"><UiText text={"OPay"} /></option>
            </select>
            <UiAttributes><input
              type="text"
              placeholder={newMethodType === 'card' ? 'Card nickname (e.g. GTB Visa ****1234)' : 'Account label'}
              value={newMethodDetails}
              onChange={e => setNewMethodDetails(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            /></UiAttributes>
            {pmError && <p className="text-xs text-red-600"><UiValue value={pmError} /></p>}
            <div className="flex gap-2">
              <button
                onClick={handleAddMethod}
                disabled={addingMethod}
                className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2 hover:opacity-90 disabled:opacity-60"
              >
                <UiValue value={addingMethod ? 'Saving...' : 'Save Method'} />
              </button>
              <button onClick={() => setShowAddCard(false)} className="px-4 rounded-lg border border-border text-sm hover:bg-muted"><UiText text={"Cancel"} /></button>
            </div>
          </div>
        )}

        {paymentMethods.length === 0 ? (
          <div className="rounded-xl bg-muted/50 border border-border p-3 text-sm text-muted-foreground">
            <UiText text={"No saved payment methods yet."} />{" "}</div>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="rounded-xl border border-border bg-background px-3 py-2.5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{pm.type?.replace(/_/g,' ') || 'Payment method'}</p>
                  <p className="text-xs text-muted-foreground">{pm.details?.label || pm.details?.account_number || JSON.stringify(pm.details || {})}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {pm.is_default && <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5"><UiText text={"Default"} /></span>}
                  {!pm.is_default && (
                    <button
                      onClick={() => handleSetDefaultMethod(pm.id)}
                      disabled={settingDefaultId === pm.id}
                      className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-60"
                    >
                      <UiValue value={settingDefaultId === pm.id ? 'Saving...' : 'Set default'} />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveMethod(pm.id)}
                    disabled={removingId === pm.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {removingId === pm.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Order history ── */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          <h3 className="font-semibold"><UiText text={"Order History"} /></h3>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-xl bg-muted/50 border border-border p-3 text-sm text-muted-foreground"><UiText text={"No orders yet."} /></div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 10).map(order => {
              const statusColor: Record<string,string> = {
                delivered: 'text-emerald-600', completed: 'text-emerald-600',
                shipped: 'text-blue-600', in_transit: 'text-blue-600',
                cancelled: 'text-red-600', pending: 'text-amber-600',
              }
              const color = statusColor[String(order.status || '')] || 'text-muted-foreground'
              return (
                <div key={order.id} className="rounded-xl border border-border bg-background px-3 py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium truncate"><UiText text={"Order #"} />{order.id.substring(0,8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at || '').toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatNaira(Number(order.grand_total) || 0)}</p>
                    <p className={`text-xs font-medium capitalize ${color}`}>{String(order.status || '').replace(/_/g,' ')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export function PaymentMethodsPage({ onBack }: PaymentMethodsPageProps) {
  const { user } = useRole()
  const isMerchant = user?.role === "merchant"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-xl flex items-center justify-between">
          <UiAttributes><button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button></UiAttributes>
          <h1 className="font-semibold">
            <UiText text={isMerchant ? "Orchid Settlement" : "Orchid Payments"} />
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        <section className="rounded-3xl border border-[#E8D7FF] bg-gradient-to-br from-[#F3E8FF] via-white to-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#6C2BD9] text-white">
              <Shield className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground">
                <UiText text={isMerchant ? "Your settlements are moving to Orchid" : "Payments are handled through Orchid"} />
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                <UiText
                  text={
                    isMerchant
                      ? "BigCat will use Orchid for merchant settlement. Your settlement activity and funds will be managed through your Orchid account instead of a BigCat wallet."
                      : "BigCat uses Orchid for payment processing. When you place an order, BigCat gives you an Orchid payment reference to use when making the payment."
                  }
                />
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">
                <UiText text={isMerchant ? "Orchid account" : "Make payments through Orchid"} />
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                <UiText
                  text={
                    isMerchant
                      ? "Set up or access your Orchid account to receive and manage BigCat settlements."
                      : "Set up or access your Orchid account to make payments for your BigCat orders."
                  }
                />
              </p>
            </div>

            <a
              href="https://orchid.ch/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-2xl bg-[#6C2BD9] px-4 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <UiText text={isMerchant ? "Open Orchid Settlement Account" : "Open Orchid"} />
            </a>
          </div>

          <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
            <UiText
              text={
                isMerchant
                  ? "BigCat does not display a merchant wallet balance here. Settlement records and account balances remain managed through Orchid."
                  : "BigCat does not display a wallet balance here. Your order payment reference remains available in your order flow."
              }
            />
          </p>
        </section>
      </main>
    </div>
  )
}
