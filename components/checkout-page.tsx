"use client"
import { UiText, UiValue, UiAttributes } from "@/components/ui-language"


import { track } from "@vercel/analytics"
import { useState, useEffect } from "react"
import { ArrowLeft, Truck, Zap, MapPin, Package, CreditCard, CheckCircle2, Wallet, Building2, Loader2, Plus, RefreshCw, ArrowDownLeft } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useRole } from "@/lib/role-context"
import { createOrder } from "@/lib/order-actions"
import { calculateDeliveryFee } from "@/lib/delivery-utils"
import { formatCurrency, convertCurrency } from "@/lib/currency-utils"
import { PaymentMethodSelector, type PaymentMethod } from "@/components/payment-method-selector"
import { getUserStrikeCount, isUserSuspended, resetSafetyState } from "@/lib/trust-safety"
import { createEscrowRecord } from "@/lib/escrow"
import { MultiCurrencyWallet } from "@/components/multi-currency-wallet"
import { sendOrderToLogistics } from "@/lib/logistics"

function trackCheckout(event: string) {
  try { track(event, { mode: 'demo' }) } catch { /* Analytics must not interrupt checkout. */ }
}

interface CheckoutPageProps {
  onBack: () => void
  onSuccess: (orderId: string) => void
}

export function CheckoutPage({ onBack, onSuccess }: CheckoutPageProps) {
  useEffect(() => { trackCheckout('checkout_opened') }, [])
  const { items, getTotal, clearCart } = useCart()
  const { user, preferences } = useRole()
  const formatCheckoutAmount = (amount: number) => formatCurrency(convertCurrency(amount, 'NGN', preferences.currency), preferences.currency)
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'doorstep' | 'pickup'>('doorstep')
  const [deliveryType, setDeliveryType] = useState<'normal' | 'express'>('normal')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('orchid')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pilotAcknowledged, setPilotAcknowledged] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [promotionDiscount, setPromotionDiscount] = useState(0)
  const [promotionNames, setPromotionNames] = useState<string[]>([])
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletLoading, setWalletLoading] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [topUpError, setTopUpError] = useState('')
  const [suspended, setSuspended] = useState(false)
  const [strikeCount, setStrikeCount] = useState(0)
  // Multi-currency wallet state
  const [payCurrency, setPayCurrency] = useState<"NGN" | "USD" | "CNY">("NGN")
  const [payRates, setPayRates] = useState<{ USD: number; NGN: number; CNY: number }>({ USD: 1, NGN: 1620, CNY: 7.26 })
  const [payAmountInCurrency, setPayAmountInCurrency] = useState(0)

  const [savedAddresses, setSavedAddresses] = useState<Array<{ id: string; label: string; address: string }>>([])
  const [serviceBooking, setServiceBooking] = useState<any>(null)
  const [serviceBillPayment, setServiceBillPayment] = useState<any>(null)
  const savedLocation = [user?.city, user?.state].filter(Boolean).join(', ')

  const mapSavedMethodToCheckoutMethod = (type?: string | null): PaymentMethod | null => {
    const normalized = String(type || '').toLowerCase().trim()
    if (!normalized) return null
    if (normalized === 'card') return 'card'
    if (normalized === 'bank' || normalized === 'bank_transfer' || normalized === 'transfer') return 'bank'
    if (normalized === 'palmpay' || normalized === 'orchid') return 'orchid'
    return null
  }

  const getCheckoutPrefsKey = () => `checkout_prefs_${user?.userId || 'guest'}`
  const getSavedAddressesKey = () => `saved_addresses_${user?.userId || 'guest'}`

  // Load service checkout context from sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedBooking = sessionStorage.getItem('serviceBookingDetails')
    if (storedBooking) {
      try {
        const parsed = JSON.parse(storedBooking)
        setServiceBooking(parsed)
        if (parsed?.serviceAddress) {
          setDeliveryAddress(String(parsed.serviceAddress))
        }
      } catch (err) {
        console.error('Failed to parse service booking:', err)
      }
    }

    const storedBill = sessionStorage.getItem('serviceBillCheckout')
    if (storedBill) {
      try {
        setServiceBillPayment(JSON.parse(storedBill))
      } catch (err) {
        console.error('Failed to parse service bill checkout:', err)
      }
    }
  }, [])

  const isServiceCheckout = Boolean(serviceBooking || serviceBillPayment)
  const isServiceBillCheckout = Boolean(serviceBillPayment)

  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => sum + (0.5 * item.quantity), 0) // Default 0.5kg per item

  // Calculate delivery fee when inputs change
  useEffect(() => {
    if (!deliveryAddress.trim()) {
      setDeliveryFee(0)
      return
    }

    const effectiveDeliveryType = fulfillmentMethod === 'pickup' ? 'pickup' : deliveryType
    const fee = calculateDeliveryFee({
      weight: totalWeight,
      deliveryType: effectiveDeliveryType,
      location: deliveryAddress,
    })
    setDeliveryFee(fee)
  }, [deliveryType, deliveryAddress, totalWeight, fulfillmentMethod])

  const GIT_FEE_RATE = 0.015 // Goods in Transit (GIT) fee: 1.5%
  const productTotal = getTotal()
  const serviceTotal = isServiceBillCheckout
    ? Number(serviceBillPayment?.totalAmount || 0)
    : Number(serviceBooking?.basePrice || 0)
  const effectivePromotionDiscount = isServiceCheckout ? 0 : Math.min(promotionDiscount, productTotal)
  const discountedProductTotal = isServiceCheckout ? serviceTotal : Math.max(0, productTotal - effectivePromotionDiscount)
  const gitFeeBase = isServiceCheckout ? serviceTotal : discountedProductTotal // GIT fee applies to goods/services, not delivery
  const gitFeeAmount = isServiceBillCheckout ? 0 : Math.round(gitFeeBase * GIT_FEE_RATE)
  const subtotalAfterPromotion = isServiceCheckout ? serviceTotal : (discountedProductTotal + deliveryFee)
  const effectiveCouponDiscount = isServiceCheckout ? 0 : Math.min(Number(appliedCoupon?.discount || 0), subtotalAfterPromotion + gitFeeAmount)
  const grandTotal = Math.max(0, subtotalAfterPromotion + gitFeeAmount - effectiveCouponDiscount)
  const isWalletPayment = paymentMethod === 'orchid'
  const isWalletInsufficient = isWalletPayment && (isServiceCheckout || deliveryAddress.trim()) && walletBalance < grandTotal
  const walletShortfall = isWalletInsufficient ? grandTotal - walletBalance : 0

  const getWalletStorageKey = () => {
    return user?.userId ? `wallet_balance_${user.userId}` : "wallet_balance_guest"
  }

  const getWalletBalance = () => {
    // Prefer DB balance; localStorage is only a fallback during the same session
    return walletBalance
  }

  const convertAmountToCurrency = (amount: number, fromCurrency: "NGN" | "USD" | "CNY", toCurrency: "NGN" | "USD" | "CNY") => {
    if (fromCurrency === toCurrency) return amount
    const fromRate = payRates[fromCurrency]
    const toRate = payRates[toCurrency]
    if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) return amount
    return (amount / fromRate) * toRate
  }

  const getSelectedWalletPaymentAmount = (baseAmount: number) => {
    if (!isWalletPayment) return 0
    if (payCurrency === 'NGN') return Number(baseAmount || 0)
    const selectedAmount = payAmountInCurrency > 0 ? payAmountInCurrency : convertAmountToCurrency(baseAmount, 'NGN', payCurrency)
    return Number(Math.max(0, selectedAmount).toFixed(2))
  }

  const finalizeWalletPayment = async (orderId: string, amount: number) => {
    if (!user?.userId) throw new Error('Please log in to continue')

    const payAmount = getSelectedWalletPaymentAmount(amount)
    const response = await fetch('/api/wallet/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.userId,
        payCurrency,
        payAmount,
        targetCurrency: 'NGN',
        targetAmount: amount,
        orderId,
        description: `Payment for order #${String(orderId).slice(0, 8).toUpperCase()}`,
        rates: payRates,
      }),
    })

    const result = await response.json()
    if (!result?.success) {
      if (payCurrency === 'NGN') {
        const fallbackRes = await fetch('/api/buyer/wallet/debit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyerId: user.userId,
            amount,
            orderId,
            reason: `Payment for order #${String(orderId).slice(0, 8).toUpperCase()}`,
          }),
        })
        const fallbackData = await fallbackRes.json()
        if (!fallbackData?.success) {
          throw new Error(fallbackData?.error || result?.error || 'Wallet payment failed')
        }
        return fallbackData
      }
      throw new Error(result?.error || 'Wallet payment failed')
    }

    return result
  }

  const loadWalletBalance = async (showLoader = false) => {
    if (!user?.userId) return
    if (showLoader) setWalletLoading(true)
    try {
      const res = await fetch(`/api/buyer/wallet?userId=${encodeURIComponent(user.userId)}`, { cache: 'no-store' })
      const data = await res.json()
      if (data?.success) {
        const dbBalance = Number(data.balance || 0)
        setWalletBalance(dbBalance)
        // Keep localStorage in sync so other parts of the app reflect DB balance
        if (typeof window !== 'undefined') {
          localStorage.setItem(getWalletStorageKey(), String(dbBalance))
        }
      }
    } catch {
      // Fall back to localStorage on network error
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(getWalletStorageKey())
        const parsed = raw ? Number(raw) : 0
        setWalletBalance(Number.isFinite(parsed) ? parsed : 0)
      }
    } finally {
      if (showLoader) setWalletLoading(false)
    }
  }

  const handleInlineTopUp = async () => {
    const amount = Number(topUpAmount || 0)
    if (!Number.isFinite(amount) || amount < 100) {
      setTopUpError('Minimum top-up is ₦100')
      return
    }
    if (!user?.userId) return
    setTopUpLoading(true)
    setTopUpError('')
    try {
      const res = await fetch('/api/buyer/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: user.userId, amount, reason: `Wallet top-up – ₦${amount.toLocaleString('en-NG')}` }),
      })
      const result = await res.json()
      if (!result?.success) {
        setTopUpError(result?.error || 'Failed to fund wallet')
        return
      }
      setTopUpAmount('')
      setShowTopUp(false)
      await loadWalletBalance(true)
    } catch {
      setTopUpError('Could not fund wallet. Please try again.')
    } finally {
      setTopUpLoading(false)
    }
  }

  useEffect(() => {
    if (!isWalletPayment) return
    loadWalletBalance(true)
  }, [isWalletPayment, user?.userId])

  useEffect(() => {
    setSuspended(isUserSuspended(user?.userId))
    setStrikeCount(getUserStrikeCount(user?.userId))
  }, [user?.userId])

  useEffect(() => {
    if (!deliveryAddress.trim() && savedLocation) {
      setDeliveryAddress(savedLocation)
    }
  }, [savedLocation])

  useEffect(() => {
    const previewPromotions = async () => {
      if (serviceBooking || items.length === 0) {
        setPromotionDiscount(0)
        setPromotionNames([])
        return
      }

      try {
        const response = await fetch('/api/promotions/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((item) => ({
              merchantId: item.merchantId,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.price,
            })),
          }),
        })
        const result = await response.json()
        if (result?.success) {
          const total = Number(result?.data?.totalDiscount || 0)
          setPromotionDiscount(Number.isFinite(total) ? total : 0)
          const names = Array.isArray(result?.data?.promotions)
            ? result.data.promotions.map((p: any) => String(p?.promotionName || '')).filter(Boolean)
            : []
          setPromotionNames(Array.from(new Set(names)))
        }
      } catch {
        setPromotionDiscount(0)
        setPromotionNames([])
      }
    }

    previewPromotions()
  }, [items, serviceBooking])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedPrefs = JSON.parse(localStorage.getItem(getCheckoutPrefsKey()) || '{}')
      if (savedPrefs?.paymentMethod) setPaymentMethod(savedPrefs.paymentMethod)
      if (savedPrefs?.deliveryType) setDeliveryType(savedPrefs.deliveryType)
      if (savedPrefs?.fulfillmentMethod) setFulfillmentMethod(savedPrefs.fulfillmentMethod)
    } catch {}

    try {
      const storedAddresses = JSON.parse(localStorage.getItem(getSavedAddressesKey()) || '[]')
      if (Array.isArray(storedAddresses)) {
        setSavedAddresses(storedAddresses.slice(0, 5))
      }
    } catch {}
  }, [user?.userId])

  useEffect(() => {
    const loadDefaultPaymentMethod = async () => {
      const userId = String(user?.userId || '').trim()
      if (!userId) return
      try {
        const res = await fetch(`/api/user/payment-methods?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
        const result = await res.json().catch(() => ({}))
        const methods = Array.isArray(result?.data) ? result.data : []
        const defaultMethod = methods.find((m: any) => Boolean(m?.is_default))
        const mapped = mapSavedMethodToCheckoutMethod(defaultMethod?.type)
        if (mapped) setPaymentMethod(mapped)
      } catch {
        // Ignore payment-method lookup failures; keep current selector value.
      }
    }

    loadDefaultPaymentMethod()
  }, [user?.userId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(
      getCheckoutPrefsKey(),
      JSON.stringify({ paymentMethod, deliveryType, fulfillmentMethod }),
    )
  }, [paymentMethod, deliveryType, fulfillmentMethod, user?.userId])

  const saveCurrentAddress = () => {
    const cleanAddress = deliveryAddress.trim()
    if (!cleanAddress) return

    const label = cleanAddress.length > 24 ? `${cleanAddress.slice(0, 24)}...` : cleanAddress
    const next = [
      { id: `${Date.now()}`, label, address: cleanAddress },
      ...savedAddresses.filter((entry) => entry.address.toLowerCase() !== cleanAddress.toLowerCase()),
    ].slice(0, 5)

    setSavedAddresses(next)
    localStorage.setItem(getSavedAddressesKey(), JSON.stringify(next))
  }

  const handleServiceBookingCheckout = async () => {
    if (!serviceBooking) return

    trackCheckout('checkout_attempted')
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/service-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: serviceBooking.serviceId,
          buyerId: user?.userId,
          scheduledAt: serviceBooking.scheduledAt,
          serviceAddress: serviceBooking.serviceAddress,
          buyerNote: serviceBooking.buyerNote,
          paymentMethod,
          paymentStatus: 'completed',
        }),
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Failed to book service')
        setIsSubmitting(false)
        return
      }

      // Create escrow record for service
      const bookingId = String(result.data?.id || `booking_${Date.now()}`)
      createEscrowRecord(bookingId, Number(serviceBooking.basePrice || 0), 0, Number(serviceBooking.basePrice || 0))

      // Update wallet if using Orchid wallet
      if (isWalletPayment) {
        const serviceAmount = Number(serviceBooking.basePrice || 0)
        try {
          await finalizeWalletPayment(bookingId, serviceAmount)
        } catch (walletError) {
          setError(String(walletError instanceof Error ? walletError.message : walletError))
          setIsSubmitting(false)
          return
        }
        setSuccess('Test service booking confirmed. No real payment was collected.')
      } else {
        setSuccess('Test service booking confirmed. No real payment was collected.')
      }

      // Clear session storage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('serviceBookingDetails')
      }

      setIsSubmitting(false)
      setTimeout(() => {
        onSuccess(bookingId)
      }, 700)
    } catch (err) {
      console.error('Service booking checkout failed:', err)
      setError('Failed to complete service booking')
      setIsSubmitting(false)
    }
  }

  const handleServiceBillCheckout = async () => {
    if (!serviceBillPayment) return

    if (!deliveryAddress.trim()) {
      setError('Please enter your service address before payment.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/service-bills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay',
          billId: String(serviceBillPayment.billId || ''),
          buyerId: user?.userId,
          paymentMethod,
          paymentAddress: deliveryAddress.trim(),
        }),
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Payment failed')
        setIsSubmitting(false)
        return
      }

      if (isWalletPayment) {
        try {
          await finalizeWalletPayment(String(result.bookingId || serviceBillPayment.billId || `bill_${Date.now()}`), Number(serviceBillPayment.totalAmount || 0))
        } catch (walletError) {
          setError(String(walletError instanceof Error ? walletError.message : walletError))
          setIsSubmitting(false)
          return
        }
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('serviceBillCheckout')
      }

      setSuccess('Test service bill recorded. No real payment was collected.')
      setIsSubmitting(false)
      setTimeout(() => {
        onSuccess(String(result.bookingId || serviceBillPayment.billId || `bill_${Date.now()}`))
      }, 700)
    } catch (err) {
      console.error('Service bill checkout failed:', err)
      setError('Failed to complete bill payment')
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (suspended) {
      setError('Your account has been temporarily suspended for violating platform policies.')
      return
    }

    if (!user?.userId) {
      setError('Please log in to place an order')
      return
    }

    // Handle service bill payment
    if (serviceBillPayment) {
      return handleServiceBillCheckout()
    }

    // Handle service booking if present
    if (serviceBooking) {
      return handleServiceBookingCheckout()
    }

    if (!deliveryAddress.trim()) {
      setError(
        fulfillmentMethod === 'pickup'
          ? 'Please enter your preferred drop-off point or pickup area'
          : 'Please enter a delivery address'
      )
      return
    }

    const currentWalletBalance = isWalletPayment ? getWalletBalance() : 0
    if (isWalletPayment && payCurrency === 'NGN' && currentWalletBalance < grandTotal) {
      setWalletBalance(currentWalletBalance)
      setError('Insufficient funds in wallet')
      return
    }

    setIsSubmitting(true)
    const merchantIdsInCart = Array.from(new Set(items.map((item) => String(item.merchantId || '').trim()).filter(Boolean)))

    const tokenChargeResponse = await fetch('/api/merchant/tokens/charge-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ merchantIds: merchantIdsInCart }),
    })
    const tokenChargeResult = await tokenChargeResponse.json()

    if (!tokenChargeResult.success && Array.isArray(tokenChargeResult.failed) && tokenChargeResult.failed.length > 0) {
      const firstFailed = tokenChargeResult.failed[0]
      setIsSubmitting(false)
      setError(`This merchant cannot receive orders right now (${firstFailed.merchantId}) because token balance is exhausted.`)
      return
    }

    const result = await createOrder({
      buyerId: user.userId,
      items: items.map(item => ({
        productId: item.productId,
        merchantId: item.merchantId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        weight: 0.5, // Default weight
      })),
      deliveryType: fulfillmentMethod === 'pickup' ? 'pickup' : deliveryType,
      deliveryAddress: deliveryAddress.trim(),
      paymentMethod,
      deliveryFee,
      appliedCoupon: appliedCoupon || null,
    })

    setIsSubmitting(false)

    if (result.success && result.data) {
      const createdOrders = Array.isArray((result.data as any).orders) && (result.data as any).orders.length > 0
        ? (result.data as any).orders
        : [result.data]
      const orderId = String(result.data.orderId || result.data.id || `order_${Date.now()}`)

      createdOrders.forEach((createdOrder: any, index: number) => {
        const currentOrderId = String(createdOrder?.id || `${orderId}_${index}`)
        const scopedItems = items.filter(
          (item) => String(item.merchantId || '') === String(createdOrder?.merchant_id || '')
        )
        const productAmount = Number(createdOrder?.product_total || 0)
          || scopedItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0)
        const currentDeliveryFee = Number(createdOrder?.delivery_fee || 0)
        const currentOrderTotal = Number(createdOrder?.grand_total || createdOrder?.total_amount || (productAmount + currentDeliveryFee))

        createEscrowRecord(currentOrderId, currentOrderTotal, currentDeliveryFee, productAmount)

        sendOrderToLogistics({
          order_id: currentOrderId,
          customer_name: user?.name || user?.email || "Customer",
          customer_phone: user?.phone || "",
          customer_city: user?.city || "",
          customer_state: user?.state || "",
          delivery_address: deliveryAddress.trim(),
          items: (scopedItems.length > 0 ? scopedItems : items).map((item) => ({ product_name: item.name, quantity: item.quantity })),
          total_amount: currentOrderTotal,
          delivery_fee: currentDeliveryFee,
          status: "pending",
        })
      })

      if (isWalletPayment) {
        try {
          await finalizeWalletPayment(orderId, grandTotal)
          setSuccess('Test wallet payment recorded. No real funds are held.')
        } catch (walletError) {
          setError(String(walletError instanceof Error ? walletError.message : walletError))
          setIsSubmitting(false)
          return
        }
      } else {
        setSuccess(
          paymentMethod === 'bank'
            ? 'Simulated bank payment recorded. Do not transfer real funds.'
            : 'Simulated card payment recorded. No card was charged.'
        )
      }
      trackCheckout('goods_checkout_completed')
      clearCart()
      setTimeout(() => {
        onSuccess(orderId)
      }, 700)
    } else {
      await Promise.all(
        merchantIdsInCart.map((merchantId) =>
          fetch('/api/merchant/tokens/top-up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchantId, amount: tokenChargeResult.tokenCostPerMerchant || 0 }),
          }).catch(() => null)
        )
      )
      setError(result.error || 'Failed to place order')
    }
  }

  if (items.length === 0 && !isServiceCheckout) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2"><UiText text={"Your cart is empty"} /></h2>
        <p className="text-muted-foreground mb-4"><UiText text={"Add some products to checkout"} /></p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          <UiText text={"Continue Shopping"} />{" "}</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground"><UiText text={"Checkout"} /></h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-32">
        {/* Order/Service Booking Summary */}
        <section className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground mb-3"><UiValue value={isServiceBillCheckout ? 'Service Bill' : serviceBooking ? 'Service Booking' : 'Order Summary'} /></h2>
          <div className="space-y-3">
            {isServiceCheckout ? (
              <>
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{isServiceBillCheckout ? (serviceBillPayment.scopeSummary || 'Service bill') : serviceBooking.serviceTitle}</p>
                    <p className="text-sm text-muted-foreground"><UiValue value={isServiceBillCheckout ? (serviceBillPayment.merchantName || 'Merchant') : serviceBooking.merchantName} /></p>
                  </div>
                  <p className="font-medium text-foreground">{formatCheckoutAmount(serviceTotal)}</p>
                </div>
                {isServiceBillCheckout && serviceBillPayment.timeline && (
                  <div className="text-sm text-muted-foreground">
                    <p><UiText text={"Timeline:"} />{" "}{serviceBillPayment.timeline}</p>
                  </div>
                )}
                {!isServiceBillCheckout && serviceBooking.scheduledAt && (
                  <div className="text-sm text-muted-foreground">
                    <p><UiText text={"Scheduled:"} />{" "}{new Date(serviceBooking.scheduledAt).toLocaleString()}</p>
                  </div>
                )}
              </>
            ) : (
              items.map((item) => (
                <div key={item.productId} className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground"><UiText text={"Qty:"} />{" "}{item.quantity}</p>
                  </div>
                  <p className="font-medium text-foreground">
                    {formatCheckoutAmount(item.price * item.quantity)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Delivery Options - Only for products */}
        {!isServiceCheckout && (
        <section className="p-4 border-b border-border space-y-4">
          <h2 className="font-semibold text-foreground"><UiText text={"Delivery Options"} /></h2>

          <div className="grid gap-3">
            <button
              onClick={() => setFulfillmentMethod('doorstep')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                fulfillmentMethod === 'doorstep'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${fulfillmentMethod === 'doorstep' ? 'bg-primary/10' : 'bg-muted'}`}>
                <Truck className={`w-5 h-5 ${fulfillmentMethod === 'doorstep' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground"><UiText text={"Doorstep Delivery"} /></p>
                <p className="text-sm text-muted-foreground"><UiText text={"Get your order delivered to your address"} /></p>
              </div>
              {fulfillmentMethod === 'doorstep' && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </button>

            <button
              onClick={() => setFulfillmentMethod('pickup')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                fulfillmentMethod === 'pickup'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${fulfillmentMethod === 'pickup' ? 'bg-primary/10' : 'bg-muted'}`}>
                <MapPin className={`w-5 h-5 ${fulfillmentMethod === 'pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground"><UiText text={"Pickup at Drop-off Point"} /></p>
                <p className="text-sm text-muted-foreground"><UiText text={"Collect your order from a nearby drop-off point"} /></p>
              </div>
              {fulfillmentMethod === 'pickup' && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </button>
          </div>

          {fulfillmentMethod === 'doorstep' && (
            <div className="space-y-3 pt-1">
              <button
                onClick={() => setDeliveryType('normal')}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  deliveryType === 'normal'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${deliveryType === 'normal' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Truck className={`w-5 h-5 ${deliveryType === 'normal' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground"><UiText text={"Normal Delivery"} /></p>
                  <p className="text-sm text-muted-foreground"><UiText text={"3-5 business days"} /></p>
                </div>
                {deliveryType === 'normal' && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>

              <button
                onClick={() => setDeliveryType('express')}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  deliveryType === 'express'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${deliveryType === 'express' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Zap className={`w-5 h-5 ${deliveryType === 'express' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground"><UiText text={"Express Delivery"} /></p>
                  <p className="text-sm text-muted-foreground"><UiText text={"1-2 business days"} /></p>
                </div>
                {deliveryType === 'express' && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>
            </div>
          )}
        </section>
        )}

        {/* Service Address - Only for services */}
        {isServiceCheckout && (
        <section className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground mb-3"><UiText text={"Service Details"} /></h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1"><UiText text={"Service Address"} /></p>
              <UiAttributes><textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your service address"
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground min-h-20"
              /></UiAttributes>
            </div>
            {!isServiceBillCheckout && serviceBooking?.scheduledAt && (
              <div>
                <p className="text-sm text-muted-foreground mb-1"><UiText text={"Scheduled Date & Time"} /></p>
                <p className="font-medium text-foreground">{new Date(serviceBooking.scheduledAt).toLocaleString()}</p>
              </div>
            )}
            {(isServiceBillCheckout ? serviceBillPayment?.notes : serviceBooking?.buyerNote) && (
              <div>
                <p className="text-sm text-muted-foreground mb-1"><UiText text={"Notes"} /></p>
                <p className="font-medium text-foreground">{isServiceBillCheckout ? serviceBillPayment.notes : serviceBooking.buyerNote}</p>
              </div>
            )}
          </div>
        </section>
        )}

        {/* Delivery Address - Only for products */}
        {!isServiceCheckout && (
        <section className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground mb-3">
            <UiValue value={fulfillmentMethod === 'pickup' ? 'Preferred Drop-off Point' : 'Delivery Address'} />
          </h2>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <UiAttributes><textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder={
                fulfillmentMethod === 'pickup'
                  ? 'Enter your preferred drop-off point or pickup area...'
                  : 'Enter your full delivery address...'
              }
              className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground resize-none h-24"
            /></UiAttributes>
          </div>
          {savedLocation && (
            <p className="mt-2 text-xs text-muted-foreground">
              <UiText text={"Prefilled from your account location:"} />{" "}{savedLocation}
            </p>
          )}
          {savedAddresses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {savedAddresses.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setDeliveryAddress(entry.address)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-secondary"
                >
                  <UiValue value={entry.label} />
                </button>
              ))}
            </div>
          )}
          <button
            onClick={saveCurrentAddress}
            disabled={!deliveryAddress.trim()}
            className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            <UiText text={"Save this address"} />{" "}</button>
        </section>
        )}

        {/* Pricing Summary */}
        <section className="p-4 border-b border-border space-y-4">
          <p className="text-sm text-muted-foreground" role="note"><UiValue value={preferences.language === 'zh' ? '显示金额按您选择的货币和演示汇率换算：USD 1 = NGN 1,600 = CNY 7.20。订单以 NGN 记账。测试试点的付款和钱包余额均为模拟，请勿转入真实资金。' : 'Displayed totals use your selected currency at a demo rate: USD 1 = NGN 1,600 = CNY 7.20. Order records remain in NGN. Test pilot: payments and wallet balances are simulated. Do not send real money.'} /></p>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={pilotAcknowledged} onChange={e => setPilotAcknowledged(e.target.checked)} />
            <span><UiValue value={preferences.language === 'zh' ? '我了解这是一笔模拟交易，不涉及真实付款。' : 'I understand this is a simulated transaction with no real payment.'} /> <a href="/pilot" target="_blank" rel="noreferrer" className="underline"><UiValue value={preferences.language === 'zh' ? '试点规则' : 'Pilot rules'} /></a></span>
          </label>
          <PaymentMethodSelector selectedMethod={paymentMethod} onSelect={setPaymentMethod} />

          {isWalletPayment && user?.userId && (
            <div className="rounded-xl border border-border overflow-hidden">
              <MultiCurrencyWallet
                userId={user.userId}
                orderAmountNGN={grandTotal}
                onPaymentSelect={(currency, amount, rates) => {
                  setPayCurrency(currency)
                  setPayAmountInCurrency(amount)
                  setPayRates(rates)
                }}
              />
            </div>
          )}
        </section>

        {suspended && (
          <section className="mx-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700"><UiText text={"Account Suspended"} /></p>
            <p className="text-xs text-red-700 mt-1">
              <UiText text={"Your account has been temporarily suspended for violating platform policies."} />{" "}</p>
            <p className="text-xs text-red-600 mt-1"><UiText text={"Strikes:"} />{" "}{strikeCount}</p>
            <button
              onClick={() => {
                resetSafetyState(user?.userId)
                setStrikeCount(0)
                setSuspended(false)
                setError('')
              }}
              className="mt-3 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-medium"
            >
              <UiText text={"Reset Strikes (Demo)"} />{" "}</button>
          </section>
        )}

        {/* Price Breakdown */}
        <section className="p-4">
          <h2 className="font-semibold text-foreground mb-3"><UiText text={"Price Details"} /></h2>
          {!isServiceCheckout && (
            <div className="mb-4 rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground"><UiText text={"Coupon Code"} /></p>
              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <UiAttributes><input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  /></UiAttributes>
                  <button
                    type="button"
                    disabled={validatingCoupon || !couponCode.trim() || !user?.userId}
                    onClick={async () => {
                      if (!couponCode.trim() || !user?.userId) return
                      setValidatingCoupon(true)
                      try {
                        const validateRes = await fetch('/api/merchant/coupons', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'validate',
                            couponCode: couponCode.trim().toUpperCase(),
                            buyerId: user.userId,
                            cartTotal: subtotalAfterPromotion + gitFeeAmount,
                          }),
                        })
                        const validateData = await validateRes.json()
                        if (validateData?.success) {
                          setAppliedCoupon({
                            code: String(validateData?.coupon?.code || couponCode.trim().toUpperCase()),
                            discount: Number(validateData?.discount || 0),
                          })
                          setError('')
                        } else {
                          setAppliedCoupon(null)
                          setError(String(validateData?.error || 'Coupon is not valid'))
                        }
                      } catch {
                        setAppliedCoupon(null)
                        setError('Failed to validate coupon')
                      } finally {
                        setValidatingCoupon(false)
                      }
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    <UiValue value={validatingCoupon ? 'Checking...' : 'Apply'} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-sm font-semibold text-emerald-700">{appliedCoupon.code} {" "}<UiText text={"applied"} /></p>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null)
                      setCouponCode('')
                    }}
                    className="text-xs font-medium text-emerald-700"
                  >
                    <UiText text={"Remove"} />{" "}</button>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            {isServiceCheckout ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><UiText text={"Service Amount"} /></span>
                  <span className="font-medium text-foreground">{formatCheckoutAmount(serviceTotal)}</span>
                </div>
                {gitFeeAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground"><UiText text={"GIT Fee (1.5%)"} /></span>
                    <span className="font-medium text-foreground">{formatCheckoutAmount(gitFeeAmount)}</span>
                  </div>
                )}
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground"><UiText text={"Total Amount"} /></span>
                  <span className="font-bold text-primary text-lg">{formatCheckoutAmount(grandTotal)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><UiText text={"Product Total"} /></span>
                  <span className="font-medium text-foreground">{formatCheckoutAmount(productTotal)}</span>
                </div>
                {effectivePromotionDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-700"><UiText text={"Promotion Discount"} />{promotionNames.length ? ` (${promotionNames[0]}${promotionNames.length > 1 ? ' +' + (promotionNames.length - 1) : ''})` : ''}</span>
                    <span className="font-medium text-emerald-700">-{formatCheckoutAmount(effectivePromotionDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><UiValue value={fulfillmentMethod === 'pickup' ? 'Pickup Fee' : 'Delivery Fee'} /></span>
                  <span className="font-medium text-foreground">
                    {deliveryAddress.trim() ? formatCheckoutAmount(deliveryFee) : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><UiText text={"GIT Fee (1.5%)"} /></span>
                  <span className="font-medium text-foreground">{formatCheckoutAmount(gitFeeAmount)}</span>
                </div>
                {effectiveCouponDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-700"><UiText text={"Coupon Discount ("} />{appliedCoupon?.code})</span>
                    <span className="font-medium text-emerald-700">-{formatCheckoutAmount(effectiveCouponDiscount)}</span>
                  </div>
                )}
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground"><UiText text={"Grand Total"} /></span>
                  <span className="font-bold text-primary text-lg">
                    {deliveryAddress.trim() ? formatCheckoutAmount(grandTotal) : '--'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
            <p className="font-semibold flex items-center gap-2">
              <span><UiText text={"🛡️ What is the GIT Fee?"} /></span>
            </p>
            <p><UiText text={"The 1.5% Goods in Transit (GIT) fee covers only goods that are damaged while in transit. It does not cover return delivery, seller misdescription, or other non-transit issues."} /></p>
          </div>

          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground space-y-1">
            <p className="font-semibold"><UiText text={"Why checkout is safe"} /></p>
            {isServiceCheckout ? (
              <>
                <p><UiText text={"Pilot simulation only. No real funds are held; service completion is being tested."} /></p>
                <p><UiText text={"You can release funds or dispute the service from your bookings."} /></p>
              </>
            ) : (
              <>
                <p><UiText text={"Pilot simulation only. No real funds are held; delivery confirmation is being tested."} /></p>
                <p>
                  <UiText text={"Expected delivery window:"} />{" "}<UiValue value={fulfillmentMethod === 'pickup' ? 'Same day pickup arrangement' : deliveryType === 'express' ? '1-2 business days' : '3-5 business days'} />.
                </p>
                <p><UiText text={"Eligible issues can be escalated from your order details for quick resolution."} /></p>
              </>
            )}
          </div>
        </section>

        {error && (
          <div className="mx-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive"><UiValue value={error} /></p>
          </div>
        )}

        {success && (
          <div className="mx-4 mt-3 p-3 bg-[#F3E8FF] border border-[#E8D7FF] rounded-lg">
            <p className="text-sm text-[#6C2BD9] font-medium"><UiValue value={success} /></p>
          </div>
        )}
      </main>

      {/* Fixed Bottom - Place Order */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground"><UiText text={"Total to pay"} /></p>
            <p className="text-xl font-bold text-foreground">
              {deliveryAddress.trim() || isServiceCheckout ? formatCheckoutAmount(grandTotal) : '--'}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!pilotAcknowledged || isSubmitting || !deliveryAddress.trim() || isWalletInsufficient || suspended}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
              isWalletPayment
                ? 'bg-[#6C2BD9] text-white'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <UiValue value={isSubmitting
              ? 'Processing...'
              : isWalletPayment
                ? 'Pay with Wallet'
                : paymentMethod === 'bank'
                  ? 'Pay via Transfer'
                  : 'Pay with Card'} />
          </button>
        </div>
      </div>
    </div>
  )
}
