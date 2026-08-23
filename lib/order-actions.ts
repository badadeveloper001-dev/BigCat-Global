'use server'

import { createClient } from '@/lib/supabase/server'
import { holdFundsInEscrow, releaseFundsFromEscrow } from '@/lib/escrow-actions'
import { getUserSafetyStatus } from '@/lib/server-trust-safety'
import { registerOrderForLogistics } from '@/lib/logistics-actions'
import { dispatchNotification } from '@/lib/notifications'
import {
  getBestPromotionDiscountForItems,
  validateCoupon,
} from '@/lib/promotion-actions'

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
    .select('id, stock, name')
    .in('id', productIds)
    .eq('merchant_id', merchantId)

  if (error) {
    if (isMissingResourceError(error)) return { success: true as const }
    return { success: false as const, error: String(error?.message || 'Failed to check stock') }
  }

  const stockById = new Map((Array.isArray(data) ? data : []).map((p: any) => [String(p.id), p]))

  for (const [productId, needed] of qtyByProduct.entries()) {
    const row = stockById.get(productId)
    if (!row) continue
    const available = Math.max(0, Number(row.stock || 0))
    if (available < needed.quantity) {
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
        if (isMissingResourceError(stockResult.error)) {
          updated = true
          break
        }
        throw stockResult.error
      }

      const currentStock = Math.max(0, Number(stockResult.data?.stock || 0))
      if (currentStock < quantity) {
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
        if (isMissingResourceError(updateResult.error)) {
          updated = true
          break
        }
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
    const supabase = createClient()
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
          deliveryFee: Math.max(0, Number(totalAmountArg || 0)),
        }
      : payloadOrBuyerId

    if (!payload.buyerId || !payload.items?.length) {
      return { success: false, error: 'Order items are required.' }
    }
    if (!payload.deliveryAddress?.trim()) {
      return { success: false, error: 'Delivery address is required.' }
    }

    const safetyStatus = await getUserSafetyStatus(payload.buyerId)
    if (safetyStatus.suspended) {
      return {
        success: false,
        error: 'Your account is temporarily suspended for violating platform policies.',
        code: 'POLICY_USER_SUSPENDED',
      }
    }

    const rawIdempotencyKey = getCheckoutIdempotencyKey(payload)
    const groupedItems = payload.items.reduce<Record<string, CreateOrderInput['items']>>((groups, item) => {
      const merchantId = String(item.merchantId || '').trim()
      const productId = String(item.productId || '').trim()
      const quantity = Number(item.quantity || 0)
      if (!merchantId || !productId || !Number.isInteger(quantity) || quantity <= 0) return groups
      if (!groups[merchantId]) groups[merchantId] = []
      const existing = groups[merchantId].find((entry) => String(entry.productId) === productId)
      if (existing) existing.quantity += quantity
      else groups[merchantId].push({ ...item, merchantId, productId, quantity })
      return groups
    }, {})

    const merchantGroups = Object.entries(groupedItems)
    if (!merchantGroups.length) {
      return { success: false, error: 'Every order item must have a valid product, merchant, and quantity.' }
    }

    // Resolve all products and prices from the database before any order is written.
    const preparedGroups: Array<{
      merchantId: string
      items: Array<{ productId: string; merchantId: string; productName: string; quantity: number; unitPrice: number; weight: number }>
      productTotal: number
      promotion: Awaited<ReturnType<typeof getBestPromotionDiscountForItems>>
      coupon: any | null
      couponDiscount: number
      deliveryFee: number
    }> = []

    for (const [merchantId, items] of merchantGroups) {
      const productIds = items.map((item) => String(item.productId))
      const { data: products, error: productsError } = await (supabase.from('products') as any)
        .select('id, merchant_id, name, price, stock, is_active, weight')
        .in('id', productIds)
        .eq('merchant_id', merchantId)

      if (productsError) throw productsError
      if (!Array.isArray(products) || products.length !== productIds.length) {
        return { success: false, error: 'One or more products are unavailable.' }
      }

      const productById = new Map(products.map((product: any) => [String(product.id), product]))
      const canonicalItems = items.map((item) => {
        const product = productById.get(String(item.productId))
        if (!product || product.is_active === false) {
          throw new Error(`${item.productName || 'A product'} is no longer available.`)
        }
        const stock = Math.max(0, Number(product.stock || 0))
        if (stock < item.quantity) {
          throw new Error(`${product.name || 'A product'} has only ${stock} item(s) left.`)
        }
        return {
          productId: String(product.id),
          merchantId,
          productName: String(product.name || item.productName || 'Product'),
          quantity: item.quantity,
          unitPrice: Number(product.price || 0),
          weight: Number(product.weight || item.weight || 0.5),
        }
      })

      const productTotal = canonicalItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      )
      const promotion = await getBestPromotionDiscountForItems(merchantId, canonicalItems)
      preparedGroups.push({
        merchantId,
        items: canonicalItems,
        productTotal,
        promotion,
        coupon: null,
        couponDiscount: 0,
        deliveryFee: payload.deliveryType === 'pickup' || preparedGroups.length > 0
          ? 0
          : Math.max(0, Number(payload.deliveryFee || 0)),
      })
    }

    if (payload.appliedCoupon?.code && preparedGroups[0]) {
      const first = preparedGroups[0]
      const promotionDiscount = Math.min(Number(first.promotion?.discountAmount || 0), first.productTotal)
      const couponBase = Math.max(0, first.productTotal - promotionDiscount + first.deliveryFee)
      const couponResult = await validateCoupon(payload.appliedCoupon.code, payload.buyerId, couponBase)
      if (!couponResult.success) {
        return { success: false, error: couponResult.error || 'Coupon is no longer valid.' }
      }
      if (String(couponResult.coupon?.merchant_id || '') !== first.merchantId) {
        return { success: false, error: 'This coupon does not apply to the selected merchant.' }
      }
      first.coupon = couponResult.coupon
      first.couponDiscount = Number(couponResult.discount || 0)
    }

    const createdOrders: any[] = []

    for (const group of preparedGroups) {
      const orderId = crypto.randomUUID()
      const merchantIdempotencyKey = `${rawIdempotencyKey}:${group.merchantId}`
      const pickupToken = payload.deliveryType === 'pickup' ? generatePickupToken(orderId) : null
      const { data, error } = await (supabase as any).rpc('create_marketplace_order_atomic', {
        p_order_id: orderId,
        p_buyer_id: payload.buyerId,
        p_merchant_id: group.merchantId,
        p_delivery_type: payload.deliveryType,
        p_delivery_address: payload.deliveryAddress.trim(),
        p_payment_method: payload.paymentMethod || 'test',
        p_delivery_fee: group.deliveryFee,
        p_promotion_id: group.promotion?.promotionId || null,
        p_promotion_discount: Number(group.promotion?.discountAmount || 0),
        p_coupon_id: group.coupon?.id || null,
        p_coupon_code: group.coupon?.code || null,
        p_coupon_discount: group.couponDiscount,
        p_pickup_token: pickupToken,
        p_idempotency_key: merchantIdempotencyKey,
        p_items: group.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          weight: item.weight,
        })),
      })

      if (error) {
        const message = String(error.message || '')
        if (message.includes('create_marketplace_order_atomic')) {
          return {
            success: false,
            error: 'Atomic checkout is not installed. Apply migration 030-atomic-order-inventory.sql before creating orders.',
            code: 'ATOMIC_CHECKOUT_NOT_INSTALLED',
          }
        }
        throw error
      }

      const atomicResult = data || {}
      const orderIdRef = String(atomicResult.id || orderId)
      const { data: order } = await (supabase.from('orders') as any)
        .select('*')
        .eq('id', orderIdRef)
        .single()

      createdOrders.push(order || { id: orderIdRef, ...atomicResult })

      // These are post-commit side effects; a delivery failure cannot corrupt order stock.
      await Promise.allSettled([
        holdFundsInEscrow(
          supabase,
          {
            ...(order || {}),
            id: orderIdRef,
            merchant_id: group.merchantId,
            product_total: Number(atomicResult.productTotal || group.productTotal),
            grand_total: Number(atomicResult.grandTotal || 0),
            total_amount: Number(atomicResult.grandTotal || 0),
            delivery_fee: group.deliveryFee,
          },
          payload.paymentMethod || 'test',
        ),
        dispatchNotification({
          userId: group.merchantId,
          type: 'order',
          title: 'You have a new order',
          message: `Order ${orderIdRef} was placed and is awaiting processing.`,
          eventKey: `order:new:merchant:${orderIdRef}`,
          emailSubject: 'New order received',
        }),
        dispatchNotification({
          userId: payload.buyerId,
          type: 'order',
          title: 'Your order has been received',
          message: `Order ${orderIdRef} has been received by the merchant.`,
          eventKey: `order:new:buyer:${orderIdRef}`,
          emailSubject: 'Order received',
        }),
      ])
    }

    return {
      success: true,
      data: {
        id: createdOrders[0]?.id,
        orderId: createdOrders[0]?.id,
        orders: createdOrders,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create order.' }
  }
}

export async function updateOrderStatus(orderId: string, status: string, actorId?: string) {
  try {
    const supabase = await createClient()
    const normalizedStatus = normalizeWorkflowStatus(status)

    const orderResult = await (supabase.from('orders') as any).select('*').eq('id', orderId).single()
    if (orderResult.error) throw orderResult.error

    const order = (orderResult.data || {}) as any
    const buyerId = String(order.buyer_id || '')
    const merchantId = String(order.merchant_id || '')
    const currentStatus = normalizeWorkflowStatus(String(order.status || ''))

    const actorRole = actorId
      ? (actorId === merchantId ? 'merchant' : actorId === buyerId ? 'buyer' : 'unknown')
      : 'system'

    if (actorRole === 'unknown') {
      return { success: false, error: 'You are not allowed to update this order.' }
    }

    const merchantAllowed = new Set([
      'order_received',
      'order_packed',
      'order_taken_for_delivery',
    ])

    const buyerAllowed = new Set([
      'delivered',
      'order_received_and_satisfied',
      'cancelled',
    ])

    if (actorRole === 'merchant' && !merchantAllowed.has(String(status || '').trim().toLowerCase()) && !merchantAllowed.has(normalizedStatus)) {
      return { success: false, error: 'Merchants can only update: Order Received, Order Packed, and Order Taken for Delivery.' }
    }

    if (actorRole === 'buyer' && !buyerAllowed.has(String(status || '').trim().toLowerCase()) && normalizedStatus !== 'delivered') {
      return { success: false, error: 'Buyers can only confirm: Order Received and Satisfied.' }
    }

    if (actorRole === 'merchant') {
      if (normalizedStatus === 'order_received' && !['paid', 'pending', 'order_received'].includes(currentStatus)) {
        return { success: false, error: 'Order must be paid before merchant can mark it as received.' }
      }
      if (normalizedStatus === 'order_packed' && !['order_received', 'order_packed'].includes(currentStatus)) {
        return { success: false, error: 'Merchant can only pack an order after marking it as received.' }
      }
      if (normalizedStatus === 'order_taken_for_delivery' && !['order_packed', 'order_taken_for_delivery'].includes(currentStatus)) {
        return { success: false, error: 'Merchant can only mark taken for delivery after order is packed.' }
      }
    }

    if (actorRole === 'buyer' && normalizedStatus === 'delivered' && !['completed', 'delivered'].includes(currentStatus)) {
      return { success: false, error: 'Buyer can confirm satisfaction only after logistics marks order as completed.' }
    }

    if (actorRole === 'buyer' && normalizedStatus === 'cancelled') {
      if (['cancelled', 'completed', 'delivered', 'in_transit'].includes(currentStatus)) {
        return { success: false, error: 'This order cannot be cancelled in its current state.' }
      }

      const assignmentResult = await (supabase.from('logistics_order_assignments') as any)
        .select('logistics_status, rider_id')
        .eq('order_id', orderId)
        .maybeSingle()

      if (!assignmentResult.error && assignmentResult.data) {
        const logisticsStatus = String(assignmentResult.data.logistics_status || '').toLowerCase().trim()
        const riderAssigned = !!assignmentResult.data.rider_id
          || ['assigned', 'in_transit', 'return_assigned', 'return_in_transit'].includes(logisticsStatus)

        if (riderAssigned) {
          return {
            success: false,
            error: 'A rider has already been assigned to this order. You can no longer cancel — please use Report Issue if there is a problem.',
          }
        }
      }
    }

    // Check for active disputes if marking as delivered
    if (normalizedStatus === 'delivered') {
      const { data: dispute, error: disputeError } = await (supabase.from('support_issues') as any)
        .select('id, status')
        .eq('order_id', orderId)
        .in('status', ['open', 'in_review'])
        .maybeSingle()

      if (!disputeError && dispute) {
        return {
          success: false,
          error: 'Cannot mark as delivered: This order has an active dispute. Funds are frozen until the dispute is resolved by BigCat admin.',
        }
      }
    }

    const updateAttempts = normalizedStatus === 'delivered'
      ? [
          { status: normalizedStatus, payment_status: 'completed', updated_at: new Date().toISOString() },
          { status: normalizedStatus, payment_status: 'completed' },
          { status: normalizedStatus, updated_at: new Date().toISOString() },
          { status: normalizedStatus },
        ]
      : normalizedStatus === 'cancelled'
        ? [
            { status: normalizedStatus, payment_status: 'refunded', updated_at: new Date().toISOString() },
            { status: normalizedStatus, payment_status: 'refunded' },
            { status: normalizedStatus, updated_at: new Date().toISOString() },
            { status: normalizedStatus },
          ]
      : [
          { status: normalizedStatus, updated_at: new Date().toISOString() },
          { status: normalizedStatus },
        ]

    let data: any = null
    let lastError: any = null

    for (const attempt of updateAttempts) {
      const result = await (supabase.from('orders') as any).update(attempt).eq('id', orderId).select().single()
      if (!result.error) {
        data = result.data
        break
      }
      lastError = result.error
    }

    if (!data && lastError) throw lastError

    const trackingId = getTrackingId(orderId)

    if (normalizedStatus === 'order_received') {
      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Merchant received your order',
          message: `Order ${orderId} has been received by the merchant and is being prepared.`,
          eventKey: `order:received-by-merchant:${orderId}`,
          emailSubject: 'Merchant received your order',
        })
      }
    }

    if (normalizedStatus === 'order_packed') {
      if (String(data?.delivery_type || '').toLowerCase() !== 'pickup') {
        await registerOrderForLogistics({
          order_id: String(data?.id || orderId),
          customer_name: 'Customer',
          customer_phone: '',
          customer_city: '',
          customer_state: '',
          delivery_address: String(data?.delivery_address || ''),
          items: Array.isArray(data?.order_items)
            ? data.order_items.map((item: any) => ({
                product_name: String(item?.product_name || 'Product'),
                quantity: Number(item?.quantity || 1),
              }))
            : [],
          total_amount: Number(data?.grand_total || data?.total_amount || 0),
          delivery_fee: Number(data?.delivery_fee || 0),
          status: 'pending',
        })
      }

      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Order packed by merchant',
          message: `Order ${orderId} is packed and has been sent to logistics for dispatch.`,
          eventKey: `order:packed:${orderId}`,
          emailSubject: 'Your order is packed',
        })
      }
    }

    if (normalizedStatus === 'order_taken_for_delivery') {
      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Order handed to logistics',
          message: `Order ${orderId} has been handed over to logistics. Tracking ID: ${trackingId}.`,
          eventKey: `order:handover:${orderId}`,
          metadata: {
            orderId,
            trackingId,
            action: 'track_package',
            actionPath: `/track/${orderId}`,
          },
          emailSubject: 'Order handed to logistics',
        })
      }
    }

    if (normalizedStatus === 'in_transit') {
      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Delivery update',
          message: `Order ${orderId} is now in transit. Tracking ID: ${trackingId}.`,
          eventKey: `order:delivery-update:${orderId}:${normalizedStatus}`,
          metadata: {
            orderId,
            trackingId,
            action: 'track_package',
            actionPath: `/track/${orderId}`,
          },
          emailSubject: 'Your order is in transit',
        })
      }
    }

    if (normalizedStatus === 'completed') {
      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Order delivered by logistics',
          message: `Order ${orderId} was delivered. Please confirm: Order Received and Satisfied to release merchant payment.`,
          eventKey: `order:logistics-completed:${orderId}`,
          metadata: {
            orderId,
            trackingId,
            action: 'track_package',
            actionPath: `/track/${orderId}`,
          },
          emailSubject: 'Order delivered - confirmation needed',
        })
      }
    }

    if (normalizedStatus === 'cancelled') {
      const productTotal = Math.max(0, Number(data?.product_total ?? order?.product_total ?? 0))
      const deliveryFee = Math.max(0, Number(data?.delivery_fee ?? order?.delivery_fee ?? 0))
      const grandTotal = Math.max(0, Number(data?.grand_total ?? order?.grand_total ?? 0))
      const gitFeeAmount = Math.round(productTotal * 0.015)
      const refundAmount = productTotal > 0
        ? productTotal + deliveryFee
        : Math.max(0, grandTotal - gitFeeAmount)

      if (buyerId && refundAmount > 0) {
        await recordBuyerWalletRefund(supabase, buyerId, orderId, refundAmount, gitFeeAmount)
      }

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
