'use server'
import { requireAdmin } from '@/lib/supabase/require-admin'

import { getRequestAuthUser } from '@/lib/supabase/request-auth'
import { createClient } from '@/lib/supabase/server'
import { holdFundsInEscrow, releaseFundsFromEscrow } from '@/lib/escrow-actions'
import { getUserSafetyStatus } from '@/lib/server-trust-safety'
import { registerOrderForLogistics } from '@/lib/logistics-actions'
import { dispatchNotification } from '@/lib/notifications'
import {
  applyCoupon,
  getBestPromotionDiscountForItems,
  incrementPromotionUsage,
} from '@/lib/promotion-actions'

async function requireOrderUser(expectedId?: string) {
  const { user, error } = await getRequestAuthUser()
  if (error || !user || (expectedId && expectedId !== user.id)) throw new Error('Please sign in to access your orders.')
  return user.id as string
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('column') && (
    message.includes('does not exist')
    || message.includes('schema cache')
    || message.includes('could not find')
  )
}

function isMissingResourceError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('does not exist')
    || message.includes('schema cache')
    || message.includes('could not find')
    || message.includes('relation')
    || message.includes('column')
}

async function checkStockAvailability(
  supabase: any,
  merchantId: string,
  items: Array<{ productId: string; quantity: number; productName?: string }>,
) {
  const qtyByProduct = new Map<string, { quantity: number; productName?: string }>()
  for (const item of items) {
    const productId = String(item.productId || '').trim()
    if (!productId) continue
    const existing = qtyByProduct.get(productId)
    qtyByProduct.set(productId, {
      quantity: Number(existing?.quantity || 0) + Number(item.quantity || 0),
      productName: item.productName || existing?.productName,
    })
  }

  const productIds = Array.from(qtyByProduct.keys())
  if (productIds.length === 0) return { success: true as const }

  const { data, error } = await (supabase.from('products') as any)
    .select('id, stock, name, minimum_order_quantity')
    .in('id', productIds)
    .eq('merchant_id', merchantId)

  if (error) {
    return { success: false as const, error: String(error?.message || 'Failed to check stock') }
  }

  const stockById = new Map((Array.isArray(data) ? data : []).map((p: any) => [String(p.id), p]))

  for (const [productId, needed] of qtyByProduct.entries()) {
    const row = stockById.get(productId)
    if (!row) return { success: false as const, error: 'A product is no longer available from this merchant. Please refresh your cart.' }
    const minimum = Number(row.minimum_order_quantity ?? 1)
    if (!Number.isSafeInteger(minimum) || minimum < 1 || needed.quantity < minimum) return { success: false as const, error: `Minimum order for ${row.name || 'this product'} is ${minimum} units. Update your cart.` }
    const available = Math.max(0, Number(row.stock || 0))
    if (!Number.isSafeInteger(available) || available <= 0 || available < needed.quantity) {
      return {
        success: false as const,
        error: `${needed.productName || row.name || 'A product'} is out of stock. Only ${available} left.`,
      }
    }
  }

  return { success: true as const }
}

async function decrementStockLevels(
  supabase: any,
  merchantId: string,
  items: Array<{ productId: string; quantity: number }>,
) {
  const qtyByProduct = new Map<string, number>()
  for (const item of items) {
    const productId = String(item.productId || '').trim()
    if (!productId) continue
    qtyByProduct.set(productId, Number(qtyByProduct.get(productId) || 0) + Number(item.quantity || 0))
  }

  for (const [productId, quantity] of qtyByProduct.entries()) {
    let updated = false

    for (let attempt = 0; attempt < 4; attempt++) {
      const stockResult = await (supabase.from('products') as any)
        .select('id, stock')
        .eq('id', productId)
        .eq('merchant_id', merchantId)
        .single()

      if (stockResult.error) {
        throw stockResult.error
      }

      const currentStock = Math.max(0, Number(stockResult.data?.stock || 0))
      if (!Number.isSafeInteger(currentStock) || currentStock <= 0 || currentStock < quantity) {
        throw new Error('Item went out of stock during checkout. Please refresh and try again.')
      }

      const nextStock = currentStock - quantity
      const updateResult = await (supabase.from('products') as any)
        .update({ stock: nextStock })
        .eq('id', productId)
        .eq('merchant_id', merchantId)
        .eq('stock', currentStock)
        .select('id')

      if (updateResult.error) {
        throw updateResult.error
      }

      if (Array.isArray(updateResult.data)) {
        if (updateResult.data.length > 0) {
          updated = true
          break
        }
      } else {
        updated = true
        break
      }
    }

    if (!updated) {
      throw new Error('Could not safely update stock due to concurrent purchases. Please retry.')
    }
  }
}

function normalizeWorkflowStatus(input: string) {
  const raw = String(input || '').trim().toLowerCase()
  if (raw === 'order_received') return 'order_received'
  if (raw === 'order_packed') return 'order_packed'
  if (raw === 'order_taken_for_delivery') return 'order_taken_for_delivery'
  if (raw === 'order_in_transit') return 'in_transit'
  if (raw === 'order_completed') return 'completed'
  if (raw === 'order_received_and_satisfied') return 'delivered'

  // Backward compatibility with old statuses.
  if (raw === 'processing') return 'order_received'
  if (raw === 'shipped') return 'in_transit'
  return raw
}

function getTrackingId(orderId: string) {
  return `BC-${String(orderId || '').replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

function generatePickupToken(orderId: string) {
  const orderPart = String(orderId || '').replace(/-/g, '').slice(0, 4).toUpperCase()
  const randomPart = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  return `BCPU${orderPart}${randomPart}`
}

async function recordBuyerWalletRefund(
  supabase: any,
  buyerId: string,
  orderId: string,
  amount: number,
  gitFeeAmount: number,
) {
  if (!buyerId || amount <= 0) return

  const payload = {
    buyer_id: buyerId,
    order_id: orderId,
    type: 'wallet_credit',
    amount,
    reason: `Order cancellation refund (GIT fee non-refundable: ₦${gitFeeAmount.toLocaleString('en-NG')})`,
    status: 'completed',
    created_at: new Date().toISOString(),
  }

  const attempts = [
    payload,
    { ...payload, reason: payload.reason },
    { ...payload, buyer_id: buyerId, order_id: orderId, type: 'wallet_credit', amount },
  ]

  for (const attempt of attempts) {
    const result = await (supabase.from('transactions') as any).insert(attempt)
    if (!result.error) return
    if (!isMissingResourceError(result.error)) return
  }
}

export async function getBuyerOrders(buyerId: string) {
  try {
    await requireOrderUser(buyerId)
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error

    const orderIds = Array.isArray(data) ? data.map((order: any) => String(order.id || '')).filter(Boolean) : []
    let assignmentByOrderId = new Map<string, any>()
    let riderById = new Map<string, any>()

    if (orderIds.length > 0) {
      const assignmentsResult = await (supabase.from('logistics_order_assignments') as any)
        .select('order_id, logistics_status, rider_id, assigned_at, completed_at, updated_at')
        .in('order_id', orderIds)

      if (assignmentsResult.error) {
        console.error(`[getBuyerOrders] Assignment query error:`, assignmentsResult.error)
      }

      if (!assignmentsResult.error && Array.isArray(assignmentsResult.data)) {
        assignmentByOrderId = new Map(assignmentsResult.data.map((row: any) => [String(row.order_id || '').trim(), row]))

        const riderIds = assignmentsResult.data
          .map((row: any) => String(row?.rider_id || '').trim())
          .filter(Boolean)

        if (riderIds.length > 0) {
          const ridersResult = await (supabase.from('logistics_riders') as any)
            .select('id, name, phone, region')
            .in('id', riderIds)

          if (ridersResult.error) {
            console.error(`[getBuyerOrders] Riders query error:`, ridersResult.error)
          }

          if (!ridersResult.error && Array.isArray(ridersResult.data)) {
            riderById = new Map(ridersResult.data.map((row: any) => [String(row.id || '').trim(), row]))
          }
        }
      }
    }

    const enriched = (data || []).map((order: any) => {
      const assignment = assignmentByOrderId.get(String(order.id || '').trim())
      const rider = assignment?.rider_id ? riderById.get(String(assignment.rider_id || '').trim()) : null
      
      return {
        ...order,
        tracking_id: getTrackingId(String(order.id || '')),
        logistics_status: String(assignment?.logistics_status || ''),
        rider_id: assignment?.rider_id || null,
        logistics_assigned_at: assignment?.assigned_at || null,
        logistics_completed_at: assignment?.completed_at || null,
        assigned_rider: rider || null,
      }
    })

    return { success: true, data: enriched }
  } catch (error: any) {
    console.error(`[getBuyerOrders] Error:`, error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getMerchantOrders(merchantId: string) {
  try {
    await requireOrderUser(merchantId)
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

type CreateOrderInput = {
  buyerId: string
  items: {
    productId: string
    merchantId: string
    productName?: string
    quantity: number
    unitPrice: number
    weight?: number
  }[]
  deliveryType: 'normal' | 'express' | 'pickup'
  deliveryAddress: string
  paymentMethod?: string
  deliveryFee?: number
  appliedCoupon?: {
    code: string
    discount: number
  } | null
  idempotencyKey?: string
}

type CachedCheckoutResult = {
  expiresAt: number
  result: any
}

const CHECKOUT_IDEMPOTENCY_TTL_MS = 2 * 60 * 1000
const checkoutResultCache = new Map<string, CachedCheckoutResult>()
const checkoutInFlight = new Map<string, Promise<any>>()

function buildCheckoutSignature(payload: CreateOrderInput) {
  const items = [...(payload.items || [])]
    .map((item) => ({
      merchantId: String(item.merchantId || '').trim(),
      productId: String(item.productId || '').trim(),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      productName: String(item.productName || '').trim(),
    }))
    .sort((a, b) => {
      const left = `${a.merchantId}:${a.productId}:${a.quantity}:${a.unitPrice}:${a.productName}`
      const right = `${b.merchantId}:${b.productId}:${b.quantity}:${b.unitPrice}:${b.productName}`
      return left.localeCompare(right)
    })

  return JSON.stringify({
    buyerId: String(payload.buyerId || '').trim(),
    deliveryType: String(payload.deliveryType || ''),
    deliveryAddress: String(payload.deliveryAddress || '').trim(),
    paymentMethod: String(payload.paymentMethod || ''),
    deliveryFee: Number(payload.deliveryFee || 0),
    appliedCoupon: payload.appliedCoupon ? {
      code: String(payload.appliedCoupon.code || '').trim(),
      discount: Number(payload.appliedCoupon.discount || 0),
    } : null,
    items,
  })
}

function getCheckoutIdempotencyKey(payload: CreateOrderInput) {
  return String(payload.idempotencyKey || buildCheckoutSignature(payload))
}

export async function createOrder(
  payloadOrBuyerId: CreateOrderInput | string,
  merchantIdArg?: string,
  itemsArg?: { productId: string; quantity: number; price: number }[],
  totalAmountArg?: number,
  shippingAddressArg?: string,
) {
  try {
    const supabase = await createClient()

    const payload: CreateOrderInput = typeof payloadOrBuyerId === 'string'
      ? {
          buyerId: payloadOrBuyerId,
          items: (itemsArg || []).map((item) => ({
            productId: item.productId,
            merchantId: merchantIdArg || '',
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          deliveryType: 'normal',
          deliveryAddress: shippingAddressArg || '',
          paymentMethod: 'card',
          deliveryFee: Math.max(0, (totalAmountArg || 0) - (itemsArg || []).reduce((sum, item) => sum + (item.price * item.quantity), 0)),
        }
      : payloadOrBuyerId

    await requireOrderUser(payload.buyerId)
    if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100 || payload.items.some(item =>
      !item.productId || !item.merchantId || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0 ||
      !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) <= 0
    )) return { success: false, error: 'Your cart contains an invalid product, quantity or price. Please review it.' }
    const idempotencyKey = payload.buyerId + ':' + getCheckoutIdempotencyKey(payload)
    const now = Date.now()
    const cachedResult = checkoutResultCache.get(idempotencyKey)
    if (cachedResult && cachedResult.expiresAt > now) {
      return cachedResult.result
    }

    const inFlight = checkoutInFlight.get(idempotencyKey)
    if (inFlight) {
      return await inFlight
    }

    const checkoutPromise = (async () => {
      if (!payload.buyerId || !payload.items?.length) {
        return { success: false, error: 'Order items are required.' }
      }

      const safetyStatus = await getUserSafetyStatus(payload.buyerId)
      if (safetyStatus.suspended) {
        return {
          success: false,
          error: 'Your account is temporarily suspended for violating platform policies.',
          code: 'POLICY_USER_SUSPENDED',
        }
      }

      const groupedItems = payload.items.reduce<Record<string, CreateOrderInput['items']>>((acc, item) => {
        const key = String(item.merchantId || '').trim() || 'unknown_merchant'
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
      }, {})

      // Validate the entire cart before creating any merchant's order.
      for (const [merchantId, merchantItems] of Object.entries(groupedItems)) {
        const availability = await checkStockAvailability(supabase, merchantId, merchantItems)
        if (!availability.success) return { success: false, error: availability.error }
      }
      const createdOrders: any[] = []

      for (const [merchantId, merchantItems] of Object.entries(groupedItems)) {
        const normalizedMerchantId = String(merchantId || '').trim()
        if (!normalizedMerchantId || normalizedMerchantId === 'unknown_merchant') {
          return { success: false, error: 'One or more cart items are missing merchant information. Please remove the item and add it again.' }
        }

      const stockCheck = await checkStockAvailability(
        supabase,
        normalizedMerchantId,
        merchantItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity || 0),
          productName: item.productName,
        })),
      )
      if (!stockCheck.success) {
        return { success: false, error: stockCheck.error }
      }

      const productTotal = merchantItems.reduce((sum, item) => sum + (Number(item.unitPrice) * Number(item.quantity)), 0)
      const appliedPromotion = await getBestPromotionDiscountForItems(
        normalizedMerchantId,
        merchantItems.map((item) => ({
          productId: String(item.productId),
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
        })),
      )
      const promotionDiscount = Math.min(Number(appliedPromotion?.discountAmount || 0), productTotal)
      const discountedProductTotal = Math.max(0, productTotal - promotionDiscount)
      const allocatedDeliveryFee = payload.deliveryType === 'pickup' ? 0 : (createdOrders.length === 0 ? Number(payload.deliveryFee || 0) : 0)
      const GIT_FEE_RATE = 0.015 // Goods in Transit (GIT) fee: 1.5%
      const gitFeeAmount = Math.round(discountedProductTotal * GIT_FEE_RATE)
      const subtotal = discountedProductTotal + allocatedDeliveryFee + gitFeeAmount
      
      // Apply coupon discount (only on first order for multi-merchant orders)
      const requestedCouponDiscount = createdOrders.length === 0 && payload.appliedCoupon
        ? Number(payload.appliedCoupon.discount) || 0
        : 0
      const couponDiscount = Math.min(requestedCouponDiscount, subtotal)
      const grandTotal = Math.max(0, subtotal - couponDiscount)
      const orderId = crypto.randomUUID()
      const pickupToken = payload.deliveryType === 'pickup' ? generatePickupToken(orderId) : null

      const resolvedPaymentMethod = payload.paymentMethod || 'card'

      const baseOrderInsert = {
        id: orderId,
        buyer_id: payload.buyerId,
        merchant_id: normalizedMerchantId,
        status: 'paid',
        grand_total: grandTotal,
        product_total: productTotal,
        delivery_fee: allocatedDeliveryFee,
        delivery_type: payload.deliveryType,
        delivery_address: payload.deliveryAddress,
        payment_method: resolvedPaymentMethod,
        payment_status: 'completed',
      }

      const orderInsertAttempts = [
        ...(pickupToken ? [{
          ...baseOrderInsert,
          applied_coupon_code: payload.appliedCoupon?.code || null,
          coupon_discount: couponDiscount,
          final_total: grandTotal,
          total_amount: grandTotal,
          shipping_address: payload.deliveryAddress,
          pickup_token: pickupToken,
        }] : []),
        {
          ...baseOrderInsert,
          applied_coupon_code: payload.appliedCoupon?.code || null,
          coupon_discount: couponDiscount,
          final_total: grandTotal,
          total_amount: grandTotal,
          shipping_address: payload.deliveryAddress,
        },
        {
          ...baseOrderInsert,
          total_amount: grandTotal,
          delivery_address: payload.deliveryAddress,
        },
        {
          ...baseOrderInsert,
          total_amount: grandTotal,
          delivery_address: payload.deliveryAddress,
        },
        {
          ...baseOrderInsert,
          delivery_address: payload.deliveryAddress,
        },
      ]

      let orderResult: any = null
      let lastOrderError: any = null

      for (const attempt of orderInsertAttempts) {
        const result = await (supabase.from('orders') as any).insert(attempt).select().single()
        if (!result.error) {
          orderResult = result
          break
        }

        if (!isMissingColumnError(result.error)) {
          throw result.error
        }

        lastOrderError = result.error
      }

      if (!orderResult?.data) {
        throw lastOrderError || new Error('Failed to create order')
      }

      const richOrderItems = merchantItems.map((item) => ({
        id: crypto.randomUUID(),
        order_id: orderResult.data?.id || orderId,
        product_id: item.productId,
        merchant_id: normalizedMerchantId,
        product_name: item.productName || 'Product',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: Number(item.unitPrice) * Number(item.quantity),
        weight: item.weight ?? 0.5,
      }))

      let itemsResult = await (supabase.from('order_items') as any).insert(richOrderItems)

      if (itemsResult.error) {
        itemsResult = await (supabase.from('order_items') as any).insert(
          merchantItems.map((item) => ({
            order_id: orderResult.data?.id || orderId,
            product_id: item.productId,
            quantity: item.quantity,
            price: item.unitPrice,
          }))
        )
      }

      if (itemsResult.error) throw itemsResult.error

      await decrementStockLevels(
        supabase,
        normalizedMerchantId,
        merchantItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity || 0),
        })),
      )

      await holdFundsInEscrow(
        supabase,
        {
          ...(orderResult.data || {}),
          id: orderResult.data?.id || orderId,
          merchant_id: normalizedMerchantId,
          product_total: productTotal,
          grand_total: grandTotal,
          total_amount: grandTotal,
          delivery_fee: allocatedDeliveryFee,
          payment_method: resolvedPaymentMethod,
          status: orderResult.data?.status || 'pending',
        },
        resolvedPaymentMethod,
      )

      const orderIdRef = String(orderResult.data?.id || orderId)

      await dispatchNotification({
        userId: normalizedMerchantId,
        type: 'order',
        title: 'You have a new order',
        message: `Order ${orderIdRef} was placed and is awaiting processing.`,
        eventKey: `order:new:merchant:${orderIdRef}`,
        emailSubject: 'New order received',
      })

      await dispatchNotification({
        userId: payload.buyerId,
        type: 'order',
        title: 'Your order has been received',
        message: `Order ${orderIdRef} has been received by the merchant.`,
        e    }

      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Order cancelled & refund issued',
          message: refundAmount > 0
            ? `Order ${orderId} has been cancelled. ₦${refundAmount.toLocaleString('en-NG')} has been credited to your wallet (GIT fee of ₦${gitFeeAmount.toLocaleString('en-NG')} is non-refundable).`
            : `Order ${orderId} has been cancelled.`,
          eventKey: `order:cancelled:buyer:${orderId}`,
          metadata: { orderId, refundAmount },
          emailSubject: 'Order cancelled',
        })
      }
      if (merchantId) {
        await dispatchNotification({
          userId: merchantId,
          type: 'order',
          title: 'Order cancelled',
          message: `Order ${orderId} has been cancelled.`,
          eventKey: `order:cancelled:merchant:${orderId}`,
          emailSubject: 'Order cancelled',
        })
      }

      return { success: true, data, refundAmount }
    }

    if (normalizedStatus === 'delivered') {
      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Order delivered',
          message: `Order ${orderId} has been delivered successfully.`,
          eventKey: `order:delivered:buyer:${orderId}`,
          emailSubject: 'Order delivered',
        })
      }
      if (merchantId) {
        await dispatchNotification({
          userId: merchantId,
          type: 'order',
          title: 'Order marked delivered',
          message: `Order ${orderId} was marked as delivered and settled.`,
          eventKey: `order:delivered:merchant:${orderId}`,
          emailSubject: 'Order delivered',
        })
      }

      const released = await releaseFundsFromEscrow(supabase, orderId, data)
      return {
        success: true,
        data: released?.order || data,
        disbursement: released?.breakdown || null,
      }
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
