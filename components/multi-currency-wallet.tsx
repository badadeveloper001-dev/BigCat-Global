"use client"

import { useState, useEffect, useCallback } from "react"
import { Wallet, ArrowLeftRight, Plus, RefreshCw, TrendingUp, Clock, ChevronDown, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

type Currency = "NGN" | "USD" | "CNY"

interface WalletBalance {
  currency: Currency
  balance: number
  locked_balance: number
}

interface WalletTx {
  id: string
  currency: Currency
  type: string
  amount: number
  description: string
  fx_rate?: number
  created_at: string
}

interface ExchangeRates {
  USD: number
  NGN: number
  CNY: number
}

const CURRENCY_META: Record<Currency, { symbol: string; name: string; flag: string; color: string }> = {
  NGN: { symbol: "₦", name: "Nigerian Naira", flag: "🇳🇬", color: "#22c55e" },
  USD: { symbol: "$", name: "US Dollar", flag: "🇺🇸", color: "#3b82f6" },
  CNY: { symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳", color: "#ef4444" },
}

function fmt(amount: number, currency: Currency): string {
  const meta = CURRENCY_META[currency]
  return `${meta.symbol}${amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function convert(amount: number, from: Currency, to: Currency, rates: ExchangeRates): number {
  if (from === to) return amount
  const usd = amount / rates[from]
  return usd * rates[to]
}

interface MultiCurrencyWalletProps {
  userId: string
  onPaymentSelect?: (currency: Currency, amount: number, rates: ExchangeRates) => void
  orderAmountNGN?: number // if provided, shows payment mode
  compact?: boolean
}

export function MultiCurrencyWallet({
  userId,
  onPaymentSelect,
  orderAmountNGN,
  compact = false,
}: MultiCurrencyWalletProps) {
  const [wallets, setWallets] = useState<WalletBalance[]>([])
  const [transactions, setTransactions] = useState<WalletTx[]>([])
  const [rates, setRates] = useState<ExchangeRates>({ USD: 1, NGN: 1620, CNY: 7.26 })
  const [rateSource, setRateSource] = useState<"live" | "fallback">("fallback")
  const [loading, setLoading] = useState(true)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [error, setError] = useState("")

  // Fund modal
  const [showFund, setShowFund] = useState(false)
  const [fundCurrency, setFundCurrency] = useState<Currency>("NGN")
  const [fundAmount, setFundAmount] = useState("")
  const [fundLoading, setFundLoading] = useState(false)
  const [fundMsg, setFundMsg] = useState("")

  // Convert modal
  const [showConvert, setShowConvert] = useState(false)
  const [fromCurrency, setFromCurrency] = useState<Currency>("USD")
  const [toCurrency, setToCurrency] = useState<Currency>("NGN")
  const [convertAmount, setConvertAmount] = useState("")
  const [convertLoading, setConvertLoading] = useState(false)
  const [convertMsg, setConvertMsg] = useState("")

  // Payment selection
  const [selectedPayCurrency, setSelectedPayCurrency] = useState<Currency>("NGN")

  const fetchRates = useCallback(async () => {
    setRatesLoading(true)
    try {
      const res = await fetch("/api/exchange-rates")
      const data = await res.json()
      if (data.success) {
        setRates(data.rates)
        setRateSource(data.source)
      }
    } catch {
      // keep fallback
    } finally {
      setRatesLoading(false)
    }
  }, [])

  const fetchWallet = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/wallet?userId=${encodeURIComponent(userId)}`)
      const data = await res.json()
      if (data.success) {
        setWallets(data.wallets || [])
        setTransactions(data.transactions || [])
      } else {
        setError(data.error || "Failed to load wallet")
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchRates()
    fetchWallet()
    const interval = setInterval(fetchRates, 5 * 60 * 1000) // refresh rates every 5 min
    return () => clearInterval(interval)
  }, [fetchRates, fetchWallet])

  const getBalance = (currency: Currency) => {
    const w = wallets.find((w) => w.currency === currency)
    return Number(w?.balance || 0)
  }

  const handleFund = async () => {
    const amount = Number(fundAmount)
    if (!amount || amount <= 0) { setFundMsg("Enter a valid amount"); return }
    setFundLoading(true)
    setFundMsg("")
    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, currency: fundCurrency, amount, description: "Manual top-up" }),
      })
      const data = await res.json()
      if (data.success) {
        setFundMsg("✅ Wallet funded successfully!")
        setFundAmount("")
        await fetchWallet()
        setTimeout(() => { setShowFund(false); setFundMsg("") }, 1500)
      } else {
        setFundMsg(data.error || "Failed to fund wallet")
      }
    } catch {
      setFundMsg("Unexpected error. Try again.")
    } finally {
      setFundLoading(false)
    }
  }

  const handleConvert = async () => {
    const amount = Number(convertAmount)
    if (!amount || amount <= 0) { setConvertMsg("Enter a valid amount"); return }
    if (fromCurrency === toCurrency) { setConvertMsg("Choose different currencies"); return }
    setConvertLoading(true)
    setConvertMsg("")
    try {
      const res = await fetch("/api/wallet/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fromCurrency, toCurrency, amount, rates }),
      })
      const data = await res.json()
      if (data.success) {
        const received = data.toAmount.toFixed(2)
        setConvertMsg(`✅ Converted! Received ${CURRENCY_META[toCurrency].symbol}${received} ${toCurrency}`)
        setConvertAmount("")
        await fetchWallet()
        setTimeout(() => { setShowConvert(false); setConvertMsg("") }, 2000)
      } else {
        setConvertMsg(data.error || "Conversion failed")
      }
    } catch {
      setConvertMsg("Unexpected error. Try again.")
    } finally {
      setConvertLoading(false)
    }
  }

  const previewConvert = () => {
    const amount = Number(convertAmount)
    if (!amount || fromCurrency === toCurrency) return null
    const result = convert(amount, fromCurrency, toCurrency, rates)
    return result
  }

  const converted = previewConvert()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading wallet…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    )
  }

  // ── Payment mode (inside checkout) ──────────────────────
  if (orderAmountNGN !== undefined && onPaymentSelect) {
    const currencies: Currency[] = ["NGN", "USD", "CNY"]
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-foreground">Pay with your Orchid Wallet</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={rateSource === "live" ? "text-green-500" : "text-yellow-500"}>●</span>
            {rateSource === "live" ? "Live rates" : "Fallback rates"}
          </div>
        </div>

        {currencies.map((c) => {
          const meta = CURRENCY_META[c]
          const balance = getBalance(c)
          const requiredInCurrency = convert(orderAmountNGN, "NGN", c, rates)
          const canAfford = balance >= requiredInCurrency
          const isSelected = selectedPayCurrency === c

          return (
            <button
              key={c}
              onClick={() => {
                if (!canAfford) return
                setSelectedPayCurrency(c)
                onPaymentSelect(c, requiredInCurrency, rates)
              }}
              disabled={!canAfford}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                isSelected && canAfford
                  ? "border-primary bg-primary/5"
                  : canAfford
                  ? "border-border hover:border-primary/50 bg-card"
                  : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: `${meta.color}18` }}>
                  {meta.flag}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">{c} Wallet</p>
                  <p className="text-xs text-muted-foreground">
                    Balance: {fmt(balance, c)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: canAfford ? meta.color : undefined }}>
                  {fmt(requiredInCurrency, c)}
                </p>
                {c !== "NGN" && (
                  <p className="text-xs text-muted-foreground">
                    1 {c} = ₦{(rates.NGN / rates[c]).toLocaleString("en", { maximumFractionDigits: 2 })}
                  </p>
                )}
                {!canAfford && (
                  <p className="text-xs text-red-400 mt-0.5">Insufficient</p>
                )}
              </div>
            </button>
          )
        })}

        <p className="text-xs text-muted-foreground text-center pt-1">
          Funds locked in escrow until delivery confirmed
        </p>
      </div>
    )
  }

  // ── Full wallet view ──────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Orchid Wallet</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rateSource === "live" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}`}>
            {rateSource === "live" ? "● Live rates" : "● Cached rates"}
          </span>
          <button onClick={() => { fetchRates(); fetchWallet() }}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Wallet cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["NGN", "USD", "CNY"] as Currency[]).map((c) => {
          const meta = CURRENCY_META[c]
          const balance = getBalance(c)
          const lockedBalance = wallets.find((w) => w.currency === c)?.locked_balance || 0
          const inUSD = convert(balance, c, "USD", rates)

          return (
            <div key={c} className="relative overflow-hidden rounded-2xl p-4 border border-border bg-card">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20"
                style={{ background: meta.color }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg">{meta.flag}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: meta.color, background: `${meta.color}15` }}>{c}</span>
                </div>
                <p className="text-2xl font-black text-foreground">{fmt(balance, c)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">≈ ${inUSD.toFixed(2)} USD</p>
                {lockedBalance > 0 && (
                  <p className="text-xs text-yellow-500 mt-1">🔒 {fmt(lockedBalance, c)} in escrow</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-0.5">{meta.name}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Exchange rates */}
      <div className="rounded-xl border border-border bg-secondary/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Exchange Rates (USD base)</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">1 USD</span>
            <span className="font-semibold text-foreground">₦{rates.NGN.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">1 USD</span>
            <span className="font-semibold text-foreground">¥{rates.CNY.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">1 CNY</span>
            <span className="font-semibold text-foreground">₦{(rates.NGN / rates.CNY).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowFund(true)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Fund Wallet
        </button>
        <button
          onClick={() => setShowConvert(true)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card font-semibold text-sm text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
          Convert
        </button>
      </div>

      {/* Recent transactions */}
      {!compact && transactions.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Recent Transactions</p>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {transactions.slice(0, 10).map((tx) => {
              const meta = CURRENCY_META[tx.currency as Currency] || CURRENCY_META.NGN
              const isCredit = ["credit", "convert_in"].includes(tx.type)
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ background: `${meta.color}15` }}>{meta.flag}</div>
                    <div>
                      <p className="text-xs font-medium text-foreground capitalize">{tx.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{tx.description || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isCredit ? "text-green-500" : "text-red-400"}`}>
                      {isCredit ? "+" : "-"}{fmt(tx.amount, tx.currency as Currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Fund modal */}
      {showFund && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground">Fund Wallet</h3>
              <button onClick={() => { setShowFund(false); setFundMsg("") }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Currency</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["NGN", "USD", "CNY"] as Currency[]).map((c) => (
                    <button key={c}
                      onClick={() => setFundCurrency(c)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        fundCurrency === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      {CURRENCY_META[c].flag} {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Amount ({fundCurrency})
                </label>
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder={`Enter ${CURRENCY_META[fundCurrency].symbol} amount`}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary"
                />
              </div>

              {fundMsg && (
                <p className={`text-sm ${fundMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{fundMsg}</p>
              )}

              <button
                onClick={handleFund}
                disabled={fundLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {fundLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {fundLoading ? "Funding…" : `Fund ${fundCurrency} Wallet`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert modal */}
      {showConvert && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground">Convert Currency</h3>
              <button onClick={() => { setShowConvert(false); setConvertMsg("") }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value as Currency)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary"
                  >
                    {(["NGN", "USD", "CNY"] as Currency[]).map((c) => (
                      <option key={c} value={c}>{CURRENCY_META[c].flag} {c} — {fmt(getBalance(c), c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value as Currency)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary"
                  >
                    {(["NGN", "USD", "CNY"] as Currency[]).map((c) => (
                      <option key={c} value={c}>{CURRENCY_META[c].flag} {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Amount in {fromCurrency}
                </label>
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  placeholder={`Enter ${CURRENCY_META[fromCurrency].symbol} amount`}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary"
                />
              </div>

              {converted !== null && convertAmount && (
                <div className="rounded-xl bg-secondary/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">You will receive</p>
                  <p className="text-xl font-black text-foreground mt-0.5">
                    {fmt(converted, toCurrency)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rate: 1 {fromCurrency} = {(rates[toCurrency] / rates[fromCurrency]).toFixed(4)} {toCurrency}
                  </p>
                </div>
              )}

              {convertMsg && (
                <p className={`text-sm ${convertMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{convertMsg}</p>
              )}

              <button
                onClick={handleConvert}
                disabled={convertLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {convertLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {convertLoading ? "Converting…" : "Convert Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
