'use server'

import { createClient } from '@/lib/supabase/server'
import { getRequestAuthUser } from '@/lib/supabase/request-auth'

export interface Review {
  id: string
  product_id: string
  rating: number
  comment: string
  created_at: string
  verified_purchase: boolean
  user_name?: string
}

async function getReviewEligibility(productId: string, userId: string) {
  const supabase = createClient()

  const { data: existingReview, error: existingError } = await supabase
    .from('reviews')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existingReview) {
    return { canReview: false, hasReviewed: true, orderId: null, reason: 'You have already reviewed this product.' }
  }

  const { data: orderItems, error: itemError } = await supabase
    .from('order_items')
    .select('order_id')
    .eq('product_id', productId)

  if (itemError) throw itemError

  const orderIds = Array.from(new Set(
    (orderItems || []).map((item: any) => String(item.order_id || '')).filter(Boolean),
  ))

  if (!orderIds.length) {
    return { canReview: false, hasReviewed: false, orderId: null, reason: 'Only buyers with a completed purchase can review this product.' }
  }

  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('buyer_id', userId)
    .in('id', orderIds)
    .in('status', ['delivered', 'completed', 'order_received_and_satisfied'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (orderError) throw orderError

  const eligibleOrder = Array.isArray(orders) ? orders[0] : null
  if (!eligibleOrder) {
    return { canReview: false, hasReviewed: false, orderId: null, reason: 'You can review this product after delivery is completed.' }
  }

  return { canReview: true, hasReviewed: false, orderId: String(eligibleOrder.id), reason: null }
}

export async function getProductReviews(productId: string) {
  try {
    if (!productId) return { success: false, error: 'Product ID is required.', data: [] }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('id, product_id, rating, comment, verified_purchase, created_at, auth_users!user_id(name, full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const reviews = (data || []).map((review: any) => {
      const profile = Array.isArray(review.auth_users) ? review.auth_users[0] : review.auth_users
      return {
        id: String(review.id),
        product_id: String(review.product_id),
        rating: Number(review.rating),
        comment: String(review.comment || ''),
        verified_purchase: review.verified_purchase === true,
        created_at: String(review.created_at),
        user_name: String(profile?.name || profile?.full_name || 'Verified buyer'),
      }
    })

    return { success: true, data: reviews }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function createReview(productId: string, rating: number, comment: string) {
  try {
    const { user, error: authError } = await getRequestAuthUser()
    if (authError || !user) {
      return { success: false, error: 'Please sign in to review this product.', code: 'AUTH_REQUIRED' }
    }

    const normalizedRating = Number(rating)
    const normalizedComment = String(comment || '').trim()

    if (!productId) return { success: false, error: 'Product ID is required.' }
    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return { success: false, error: 'Rating must be a whole number from 1 to 5.' }
    }
    if (normalizedComment.length < 10 || normalizedComment.length > 1000) {
      return { success: false, error: 'Review must be between 10 and 1,000 characters.' }
    }

    const eligibility = await getReviewEligibility(productId, user.id)
    if (!eligibility.canReview || !eligibility.orderId) {
      return {
        success: false,
        error: eligibility.reason || 'You are not eligible to review this product.',
        hasReviewed: eligibility.hasReviewed,
      }
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        user_id: user.id,
        order_id: eligibility.orderId,
        rating: normalizedRating,
        comment: normalizedComment,
        verified_purchase: true,
      })
      .select('id, product_id, rating, comment, verified_purchase, created_at')
      .single()

    if (error) {
      if (String(error.code || '') === '23505') {
        return { success: false, error: 'You have already reviewed this product.', hasReviewed: true }
      }
      throw error
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to submit review.' }
  }
}

export async function canUserReview(productId: string) {
  try {
    const { user, error: authError } = await getRequestAuthUser()
    if (authError || !user) {
      return {
        success: true,
        canReview: false,
        hasReviewed: false,
        reason: 'Sign in to review products you have purchased.',
      }
    }

    const eligibility = await getReviewEligibility(productId, user.id)
    return { success: true, ...eligibility }
  } catch (error: any) {
    return { success: false, error: error.message, canReview: false, hasReviewed: false }
  }
}
