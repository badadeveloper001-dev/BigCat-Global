'use server'

import { createClient } from '@/lib/supabase/server'

export interface Review {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string
  created_at: string
  user_name?: string
}

export async function getProductReviews(productId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('reviews').select('*, auth_users!user_id(name)').eq('product_id', productId).order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function createReview(productId: string, userId: string, rating: number, comment: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('reviews').insert({ product_id: productId, user_id: userId, rating, comment }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function canUserReview(productId: string, userId: string) {
  try {
    const supabase = await createClient()
    const { data: existingReview } = await supabase.from('reviews').select('id').eq('product_id', productId).eq('user_id', userId).single()
    if (existingReview) return { success: true, canReview: false }
    
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('order_id')
      .eq('product_id', productId)

    const orderIds = (orderItems || []).map((oi: any) => oi.order_id).filter(Boolean)
    const { data: orders } = orderIds.length
      ? await supabase.from('orders').select('id').eq('buyer_id', userId).in('id', orderIds)
      : { data: [] }
    return { success: true, canReview: orders && orders.length > 0 }
  } catch (error: any) {
    return { success: false, error: error.message, canReview: false }
  }
}
