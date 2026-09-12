'use server'

import { requireActor, requireOrderActor } from '@/lib/supabase/authorize'

import { submitPilotOrder } from '@/lib/pilot-checkout'
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
    await requireActor(buyerId)
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
    await requireActor(merchantId, ['merchant'])
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

export async function createOrder(payload: CreateOrderInput & { testOutcome?: 'success' | 'failed' | 'cancelled'; payCurrency?: 'NGN' | 'CNY' | 'USD' }) {
  try {
    return await submitPilotOrder(payload)
  } catch (error: any) {
    return { success: false, error: error.message || 'Test checkout failed' }
  }
}

export async function updateOrderStatus(orderId: string, status: string, actorId?: string) {
  try {
    actorId = (await requireOrderActor(orderId)).id
    const supabase = await createClient()
    const normalizedStatus = normalizeWorkflowStatus(status)
    const { data: transition, error: transitionError } = await supabase.rpc('pilot_transition_order', { p_order_id: orderId, p_actor_id: actorId, p_status: normalizedStatus })
    if (transitionError) throw transitionError
    return transition
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
