import { createHash } from 'node:crypto'
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireActor } from '@/lib/supabase/authorize'
import { requirePilotMode, TEST_FX_RATES, testDeliveryFee, PILOT_NOTICE } from '@/lib/pilot-config'
import { getBestPromotionDiscountForItems, validateCoupon } from '@/lib/promotion-actions'
import { dispatchNotification } from '@/lib/notifications'

export async function preparePilotOrder(payload: any) {
  requirePilotMode()
  const actor = await requireActor(undefined, ['buyer'])
  if (payload.buyerId && actor.id !== payload.buyerId) throw new Error('Access denied')
  if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 50) throw new Error('Choose between 1 and 50 items')
  const quantities = new Map<string, number>()
  for (const item of payload.items) {
    if (typeof item.productId !== 'string' || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) throw new Error('Invalid product quantity')
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity)
  }
  const { data: products, error } = await createClient().from('products').select('id, merchant_id, name, price, weight, stock, is_active').in('id', [...quantities.keys()])
  if (error) throw error
  if (!products || products.length !== quantities.size) throw new Error('Product unavailable')
  if (new Set(products.map(p => p.merchant_id)).size !== 1) throw new Error('For this pilot, check out products from one merchant at a time.')
  const merchantId = products[0].merchant_id
  const items = products.map(p => {
    const quantity = quantities.get(p.id)!
    if (p.is_active === false || Number(p.price) < 0 || !Number.isFinite(Number(p.price))) throw new Error('Product unavailable')
    return { productId: p.id, productName: p.name, merchantId, quantity, unitPrice: Number(p.price), weight: Number(p.weight) || 0.5 }
  })
  if (!['normal', 'express', 'pickup'].includes(payload.deliveryType)) throw new Error('Invalid delivery option')
  const productTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const deliveryFee = testDeliveryFee(payload.deliveryType, items.reduce((sum, i) => sum + i.quantity * i.weight, 0))
  const promotion = await getBestPromotionDiscountForItems(merchantId, items)
  const discount = Math.min(productTotal, Math.max(0, Number(promotion?.discountAmount || 0)))
  const fee = Math.round((productTotal - discount) * 0.015 * 100) / 100
  let coupon: any = null
  let couponDiscount = 0
  if (payload.appliedCoupon?.code) {
    const result = await validateCoupon(String(payload.appliedCoupon.code), actor.id, productTotal - discount + deliveryFee + fee)
    if (!result.success || result.coupon?.merchant_id !== merchantId) throw new Error(result.error || 'Coupon does not apply to this merchant')
    coupon = result.coupon
    couponDiscount = Number(result.discount || 0)
  }
  return { actor, merchantId, items, productTotal, deliveryFee, promotion, discount, fee, coupon, couponDiscount, grandTotal: Math.max(0, productTotal - discount + deliveryFee + fee - couponDiscount) }
}

export async function submitPilotOrder(payload: any) {
  requirePilotMode()
  const actor = await requireActor(undefined, ['buyer'])
  if (payload.buyerId && payload.buyerId !== actor.id) throw new Error('Access denied')
  const requestHash = createHash('sha256').update(JSON.stringify({items: payload.items?.map((i: any) => ({productId:i.productId,quantity:i.quantity})).sort((a: any,b: any)=>String(a.productId).localeCompare(String(b.productId))), address: payload.deliveryAddress?.trim(), delivery: payload.deliveryType, method: payload.paymentMethod, currency: payload.payCurrency || 'NGN', outcome: payload.testOutcome || 'success', coupon: payload.appliedCoupon?.code || null})).digest('hex')
  const previous = await createClient().from('pilot_attempts').select('payload_hash,result').eq('buyer_id',actor.id).eq('request_key',payload.idempotencyKey).maybeSingle()
  if (previous.error) throw previous.error
  if (previous.data) {
    if (previous.data.payload_hash !== requestHash) throw new Error('Request ID already used for a different checkout')
    return {...previous.data.result, replayed:true}
  }
  const quote = await preparePilotOrder(payload)
  if (typeof payload.deliveryAddress !== 'string' || !payload.deliveryAddress.trim() || payload.deliveryAddress.length > 1000) throw new Error('A delivery address is required')
  if (typeof payload.idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(payload.idempotencyKey)) throw new Error('A checkout request ID is required')
  const outcome = payload.testOutcome || 'success'
  const payCurrency = payload.payCurrency || 'NGN'
  if (!['success', 'failed', 'cancelled'].includes(outcome) || !['NGN', 'CNY', 'USD'].includes(payCurrency)) throw new Error('Invalid test payment option')
  const supabase = createClient()
  const { data, error } = await supabase.rpc('pilot_checkout', {
    p_buyer_id: quote.actor.id,
    p_key: payload.idempotencyKey,
    p_payload: {
      requestHash,
      merchantId: quote.merchantId, items: quote.items, deliveryType: payload.deliveryType,
      deliveryAddress: payload.deliveryAddress.trim(), outcome, payCurrency,
      method: payload.paymentMethod === 'orchid' || payload.paymentMethod === 'wallet' ? 'wallet' : 'test',
      deliveryFee: quote.deliveryFee, promotionId: quote.promotion?.promotionId || null,
      promotionDiscount: quote.discount, couponId: quote.coupon?.id || null,
      couponCode: quote.coupon?.code || null, couponDiscount: quote.couponDiscount,
    },
  })
  if (error) throw error
  if (data?.success && !data?.replayed) {
    await Promise.allSettled([quote.actor.id, quote.merchantId].map(userId => dispatchNotification({
      userId, type: 'order', title: 'Test order received / 测试订单已收到',
      message: `${PILOT_NOTICE} 测试交易，不涉及真实资金。 Order: ${data.data.orderId}`,
      eventKey: `pilot:order:${data.data.orderId}:${userId}`, metadata: { orderId: data.data.orderId },
    })))
  }
  return data
}
