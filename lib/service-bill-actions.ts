'use server'

import { requirePilotMode } from '@/lib/pilot-config'

import { requireActor } from '@/lib/supabase/authorize'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications'

function isMissingInfraError(error: any) {
  const msg = String(error?.message || '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache')
}

async function getMerchantName(merchantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('auth_users')
    .select('business_name, name, full_name')
    .eq('id', merchantId)
    .maybeSingle()
  return String(data?.business_name || data?.name || data?.full_name || 'Merchant').trim()
}

async function getBuyerName(buyerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('auth_users')
    .select('name, full_name, email')
    .eq('id', buyerId)
    .maybeSingle()
  return String(data?.name || data?.full_name || data?.email || 'Buyer').trim()
}

export interface BillLineItem {
  description: string
  quantity: number
  unit_price: number
}

export async function createServiceBill(
  merchantId: string,
  input: {
    buyerId: string
    serviceListingId?: string
    scopeSummary?: string
    timeline?: string
    lineItems: BillLineItem[]
    discountAmount?: number
    notes?: string
    validUntil?: string
  },
) {
  if (!merchantId || !input.buyerId) {
    return { success: false, error: 'merchantId and buyerId are required' }
  }

  const lineItems = Array.isArray(input.lineItems) ? input.lineItems : []
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price || 0), 0)
  const discount = Math.max(0, Math.min(Number(input.discountAmount || 0), subtotal))
  const total = Math.max(0, subtotal - discount)

  try {
    await requireActor(merchantId, ['merchant'])
    const supabase = await createClient()
    const { data, error } = await (supabase.from('service_bills') as any)
      .insert({
        merchant_id: merchantId,
        buyer_id: input.buyerId,
        service_listing_id: input.serviceListingId || null,
        scope_summary: String(input.scopeSummary || '').trim() || null,
        timeline: String(input.timeline || '').trim() || null,
        line_items: lineItems,
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: Number(discount.toFixed(2)),
        total_amount: Number(total.toFixed(2)),
        notes: String(input.notes || '').trim() || null,
        valid_until: input.validUntil ? new Date(input.validUntil).toISOString() : null,
        status: 'draft',
      })
      .select('*')
      .single()

    if (error) {
      if (isMissingInfraError(error)) {
        return { success: false, error: 'Run scripts/025-create-service-bills.sql in Supabase to enable billing.' }
      }
      throw error
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create bill' }
  }
}

export async function updateServiceBill(
  merchantId: string,
  billId: string,
  updates: Partial<{
    scopeSummary: string
    timeline: string
    lineItems: BillLineItem[]
    discountAmount: number
    notes: string
    validUntil: string
  }>,
) {
  try {
    await requireActor(merchantId, ['merchant'])
    const supabase = await createClient()

    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    if (updates.scopeSummary !== undefined) patch.scope_summary = updates.scopeSummary
    if (updates.timeline !== undefined) patch.timeline = updates.timeline
    if (updates.notes !== undefined) patch.notes = updates.notes
    if (updates.validUntil !== undefined) patch.valid_until = updates.validUntil ? new Date(updates.validUntil).toISOString() : null

    if (Array.isArray(updates.lineItems)) {
      const lineItems = updates.lineItems
      const subtotal = lineItems.reduce((sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price || 0), 0)
      const discount = Math.max(0, Math.min(Number(updates.discountAmount || 0), subtotal))
      patch.line_items = lineItems
      patch.subtotal = Number(subtotal.toFixed(2))
      patch.discount_amount = Number(discount.toFixed(2))
      patch.total_amount = Number(Math.max(0, subtotal - discount).toFixed(2))
    }

    const { data, error } = await (supabase.from('service_bills') as any)
      .update(patch)
      .eq('id', billId)
      .eq('merchant_id', merchantId)
      .eq('status', 'draft')
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update bill' }
  }
}

export async function sendServiceBill(merchantId: string, billId: string) {
  try {
    await requireActor(merchantId, ['merchant'])
    const supabase = await createClient()

    const { data, error } = await (supabase.from('service_bills') as any)
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', billId)
      .eq('merchant_id', merchantId)
      .in('status', ['draft', 'sent'])
      .select('*')
      .single()

    if (error) throw error
    if (!data) return { success: false, error: 'Bill not found or already paid/cancelled' }

    const merchantName = await getMerchantName(merchantId)

    await dispatchNotification({
      userId: data.buyer_id,
      type: 'order',
      title: 'You have a new bill to pay',
      message: `${merchantName} sent you a bill for ₦${Number(data.total_amount).toLocaleString('en-NG')}.${data.scope_summary ? ' ' + data.scope_summary : ''}`,
      eventKey: `service-bill-sent:${data.id}`,
      metadata: { billId: data.id, merchantId, merchantName, totalAmount: data.total_amount },
    }).catch(() => null)

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send bill' }
  }
}

export async function getMerchantServiceBills(merchantId: string) {
  try {
    await requireActor(merchantId, ['merchant'])
    const supabase = await createClient()
    const { data, error } = await (supabase.from('service_bills') as any)
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      if (isMissingInfraError(error)) return { success: true, data: [] }
      throw error
    }

    const rows = data || []
    const buyerIds = Array.from(new Set(rows.map((r: any) => String(r.buyer_id)).filter(Boolean)))
    if (buyerIds.length === 0) return { success: true, data: rows }

    const { data: buyers } = await supabase
      .from('auth_users')
      .select('id, business_name, name, full_name, email')
      .in('id', buyerIds)

    const buyerMap = new Map((buyers || []).map((b: any) => [String(b.id), b]))

    const withNames = rows.map((bill: any) => {
      const buyer = buyerMap.get(String(bill.buyer_id))
      return {
        ...bill,
        buyer_name: buyer?.business_name || buyer?.name || buyer?.full_name || buyer?.email || 'Buyer',
      }
    })

    return { success: true, data: withNames }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load bills', data: [] }
  }
}

export async function getBuyerServiceBills(buyerId: string) {
  try {
    await requireActor(buyerId, ['buyer'])
    const supabase = await createClient()
    const { data, error } = await (supabase.from('service_bills') as any)
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      if (isMissingInfraError(error)) return { success: true, data: [] }
      throw error
    }

    const rows = data || []
    const merchantIds = Array.from(new Set(rows.map((r: any) => String(r.merchant_id)).filter(Boolean)))
    if (merchantIds.length === 0) return { success: true, data: rows }

    const { data: merchants } = await supabase
      .from('auth_users')
      .select('id, business_name, name, full_name')
      .in('id', merchantIds)

    const merchantMap = new Map((merchants || []).map((m: any) => [String(m.id), m]))

    const withNames = rows.map((bill: any) => {
      const merchant = merchantMap.get(String(bill.merchant_id))
      return {
        ...bill,
        merchant_name: merchant?.business_name || merchant?.name || merchant?.full_name || 'Merchant',
      }
    })

    return { success: true, data: withNames }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load bills', data: [] }
  }
}

export async function payServiceBill(buyerId: string, billId: string, options?: {paymentMethod?: 'palmpay' | 'bank' | 'card'; paymentAddress?: string}) {
 try {
  requirePilotMode()
  await requireActor(buyerId, ['buyer'])
  const {data,error} = await createClient().rpc('pilot_service_checkout',{p_buyer:buyerId,p_key:'service-bill:'+billId,p_payload:{billId,address:options?.paymentAddress,outcome:'success'}})
  if (error) throw error
  return data
 } catch(e: any) {return {success:false,error:e.message}}
}

export async function cancelServiceBill(actorId: string, billId: string, actorType: 'merchant' | 'buyer') {
  try {
    await requireActor(actorId, [actorType])
    const supabase = await createClient()
    const filter = actorType === 'merchant' ? 'merchant_id' : 'buyer_id'

    const { error } = await (supabase.from('service_bills') as any)
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', billId)
      .eq(filter, actorId)
      .in('status', ['draft', 'sent'])

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel bill' }
  }
}
