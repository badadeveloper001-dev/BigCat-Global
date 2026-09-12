"use client"
import { PilotServiceCheckout } from './pilot-service-checkout'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { useRole } from '@/lib/role-context'
import { createOrder } from '@/lib/order-actions'
import { formatGlobalPrice } from '@/lib/currency-utils'
import { TEST_FX_RATES } from '@/lib/pilot-config'

export function CheckoutPage({ onBack, onSuccess }: { onBack: () => void; onSuccess: (id: string) => void }) {
  const [service,setService]=useState<any>(null)
  useEffect(()=>{try{const stored=sessionStorage.getItem('serviceBillCheckout')||sessionStorage.getItem('serviceBookingDetails');if(stored)setService(JSON.parse(stored))}catch{}},[])
  const { items, clearCart } = useCart()
  const { user, preferences } = useRole()
  const zh = preferences.language === 'zh'
  const t = (en: string, cn: string) => zh ? cn : en
  const [address, setAddress] = useState([user?.city, user?.state].filter(Boolean).join(', '))
  const [delivery, setDelivery] = useState<'normal' | 'express' | 'pickup'>('normal')
  const [method, setMethod] = useState('test')
  const [currency, setCurrency] = useState<'NGN' | 'CNY' | 'USD'>(preferences.currency)
  const [outcome, setOutcome] = useState<'success' | 'failed' | 'cancelled'>('success')
  const [coupon, setCoupon] = useState('')
  const [quote, setQuote] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const requestId = useRef('')
  const submitting = useRef(false)
  const cartKey = JSON.stringify(items.map(i => ({ productId: i.productId, quantity: i.quantity })))
  const money = (n: number) => formatGlobalPrice(n, 'NGN', currency)
  useEffect(() => {
    if (service) return
    const controller = new AbortController()
    setQuote(null); setQuoting(true); setError(''); requestId.current = ''
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/checkout/quote', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: JSON.parse(cartKey), deliveryType: delivery, appliedCoupon: coupon ? { code: coupon } : null }) })
        const data = await response.json()
        if (!data.success) throw new Error(data.error)
        setQuote(data)
      } catch (e: any) { if (e.name !== 'AbortError') setError(e.message) }
      finally { if (!controller.signal.aborted) setQuoting(false) }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [cartKey, delivery, coupon, service])
  useEffect(() => { requestId.current = '' }, [address, method, currency, outcome])
  async function submit() {
    if (submitting.current || !quote || !user) return
    submitting.current = true; setBusy(true); setError('')
    if (!requestId.current) requestId.current = crypto.randomUUID()
    try {
      const result = await createOrder({ buyerId: user.userId, items: items.map(i => ({ productId: String(i.productId), merchantId: String(i.merchantId), quantity: i.quantity, unitPrice: i.price })), deliveryType: delivery, deliveryAddress: address, paymentMethod: method, appliedCoupon: coupon ? { code: coupon, discount: 0 } : null, payCurrency: currency, testOutcome: outcome, idempotencyKey: requestId.current })
      if (!result.success) {
        setError(result.error || t('Test payment failed', '测试支付失败'))
        if (result.outcome) requestId.current = ''
        return
      }
      clearCart(); onSuccess(result.data.orderId)
    } catch { setError(t('Connection interrupted. Retry to check the same transaction.', '连接中断。请重试查询同一笔交易。')) }
    finally { setBusy(false); submitting.current = false }
  }
  if(service) return <PilotServiceCheckout context={service} onBack={onBack} onSuccess={onSuccess} zh={zh} />
  return <main className="mx-auto max-w-xl space-y-5 p-5 pb-24">
    <button onClick={onBack} className="underline">{t('Back to cart', '返回购物车')}</button>
    <h1 className="text-2xl font-bold">{t('Test checkout', '测试结账')}</h1>
    <p role="note" className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-amber-950">{t('Pilot only. No money moved. Delivery and escrow are simulated.', '仅限试用。不涉及真实资金。配送和资金托管均为模拟。')}</p>
    <p className="text-sm">{t('For this pilot, check out one merchant at a time.', '试用期间，每次仅结算一家商家的商品。')}</p>
    <label className="block">{t('Delivery address / pickup contact', '收货地址／自提联系人')}<textarea value={address} onChange={e => setAddress(e.target.value)} maxLength={1000} className="mt-1 w-full rounded border bg-background p-3" /></label>
    <label className="block">{t('Simulated delivery', '模拟配送')}<select value={delivery} onChange={e => setDelivery(e.target.value as any)} className="block w-full rounded border bg-background p-3"><option value="normal">{t('Standard', '标准配送')}</option><option value="express">{t('Express', '快递')}</option><option value="pickup">{t('Pickup', '自提')}</option></select></label>
    <label className="block">{t('Coupon', '优惠码')}<input value={coupon} onChange={e => setCoupon(e.target.value.trim().toUpperCase())} className="block w-full rounded border bg-background p-3" /></label>
    <label className="block">{t('Display / test payment currency', '显示／测试支付币种')}<select value={currency} onChange={e => setCurrency(e.target.value as any)} className="block w-full rounded border bg-background p-3">{Object.keys(TEST_FX_RATES).map(c => <option key={c}>{c}</option>)}</select></label>
    <p className="text-xs text-muted-foreground">{t('Fixed test rates: USD 1 = NGN 1,600 = CNY 7.20. Order accounting uses NGN.', '固定测试汇率：1美元＝1,600奈拉＝7.20人民币。订单以奈拉记账。')}</p>
    <label className="block">{t('Test payment method', '测试支付方式')}<select value={method} onChange={e => setMethod(e.target.value)} className="block w-full rounded border bg-background p-3"><option value="test">{t('Simulated payment (no wallet required)', '模拟支付（无需钱包）')}</option><option value="wallet">{t('Test wallet balance', '测试钱包余额')}</option></select></label>
    <label className="block">{t('Test scenario', '测试场景')}<select value={outcome} onChange={e => setOutcome(e.target.value as any)} className="block w-full rounded border bg-background p-3"><option value="success">{t('Successful', '成功')}</option><option value="failed">{t('Declined', '失败')}</option><option value="cancelled">{t('Cancelled', '取消')}</option></select></label>
    {quoting && <p role="status">{t('Calculating…', '正在计算…')}</p>}
    {quote && <dl className="space-y-2 rounded border p-4">{[[t('Products', '商品'), quote.productTotal], [t('Discounts', '优惠'), -quote.promotionDiscount-quote.couponDiscount], [t('Simulated delivery', '模拟配送'), quote.deliveryFee], [t('Simulated fee', '模拟费用'), quote.fee], [t('Total', '总计'), quote.grandTotal]].map(([label, amount]) => <div key={String(label)} className="flex justify-between"><dt>{label}</dt><dd>{money(Number(amount))}</dd></div>)}</dl>}
    {error && <p role="alert" className="rounded border border-red-400 p-3">{error}</p>}
    <button disabled={busy || quoting || !quote || !address.trim()} onClick={submit} className="w-full rounded-xl bg-primary p-4 font-semibold text-primary-foreground disabled:opacity-50">{busy ? t('Processing test…', '正在处理测试…') : t('Submit test transaction', '提交测试交易')}</button>
  </main>
}
