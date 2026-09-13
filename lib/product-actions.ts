'use server'

import { createClient } from '@/lib/supabase/server'
import { convertCurrency } from '@/lib/currency-utils'
import { searchFilterValue } from '@/lib/discovery-utils'
import { validateMoq } from '@/lib/product-moq'
import { requireMerchant } from '@/lib/supabase/require-merchant'
import { buildLocationQuery, geocodeLocation, haversineDistanceKm } from '@/lib/location-utils'
import { getPromotionPercentOffForProduct } from '@/lib/promotion-actions'

interface ProductInput {
  name: string
  description?: string
  price: number
  listing_currency?: 'NGN' | 'CNY' | 'USD'
  listing_price?: number
  cost_price?: number
  category?: string
  image_url?: string
  images?: string[]
  minimum_order_quantity?: number
  stock?: number
  weight?: number
  is_active?: boolean
  status?: string
}

const MAX_DECIMAL_VALUE = 99999999.99
const MAX_STOCK_VALUE = 99999999
const COST_PRICE_FALLBACK_PREFIX = '__bigcat_cost_price__:'

function isBigZeeWears(value: unknown) {
  const normalized = String(value || '').toLowerCase()
  return normalized.includes('big zee wears') || normalized.includes('big zee')
}

function sortBigZeeFirst<T>(items: T[], getText: (item: T) => string) {
  return [...items].sort((a, b) => {
    const aIsBigZee = isBigZeeWears(getText(a))
    const bIsBigZee = isBigZeeWears(getText(b))

    if (aIsBigZee === bIsBigZee) return 0
    return aIsBigZee ? -1 : 1
  })
}

function toFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getMerchantLocationText(merchant: any) {
  return buildLocationQuery(merchant?.city, merchant?.state, merchant?.location)
}

async function attachProductDistances(products: any[], buyerLat?: number | null, buyerLng?: number | null) {
  const latitude = toFiniteNumber(buyerLat)
  const longitude = toFiniteNumber(buyerLng)

  if (latitude === null || longitude === null) {
    return products
  }

  const locationCache = new Map<string, Awaited<ReturnType<typeof geocodeLocation>>>()

  return Promise.all(
    products.map(async (product) => {
      const merchant = product?.merchant_profiles
      const locationQuery = getMerchantLocationText(merchant)

      if (!merchant || !locationQuery) {
        return product
      }

      if (!locationCache.has(locationQuery)) {
        locationCache.set(locationQuery, await geocodeLocation(locationQuery))
      }

      const resolvedLocation = locationCache.get(locationQuery)
      const distanceKm = resolvedLocation
        ? haversineDistanceKm(latitude, longitude, resolvedLocation.latitude, resolvedLocation.longitude)
        : null

      return {
        ...product,
        distance_km: distanceKm,
        merchant_profiles: {
          ...merchant,
          distance_km: distanceKm,
        },
      }
    }),
  )
}

function sortProductsByLocation(products: any[]) {
  return [...products].sort((a, b) => {
    const leftDistance = toFiniteNumber(a?.merchant_profiles?.distance_km ?? a?.distance_km) ?? Number.POSITIVE_INFINITY
    const rightDistance = toFiniteNumber(b?.merchant_profiles?.distance_km ?? b?.distance_km) ?? Number.POSITIVE_INFINITY

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance
    }

    const leftText = `${a?.merchant_profiles?.business_name || ''} ${a?.merchant_profiles?.name || ''} ${a?.name || ''}`
    const rightText = `${b?.merchant_profiles?.business_name || ''} ${b?.merchant_profiles?.name || ''} ${b?.name || ''}`

    const leftIsBigZee = isBigZeeWears(leftText)
    const rightIsBigZee = isBigZeeWears(rightText)

    if (leftIsBigZee === rightIsBigZee) return 0
    return leftIsBigZee ? -1 : 1
  })
}

function extractCostPriceFromImageMetadata(images: unknown): number {
  if (!Array.isArray(images)) return 0

  const token = images.find(
    (item) => typeof item === 'string' && item.startsWith(COST_PRICE_FALLBACK_PREFIX),
  )

  if (typeof token !== 'string') return 0

  const parsed = Number(token.replace(COST_PRICE_FALLBACK_PREFIX, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function stripCostPriceMetadata(images: unknown): string[] {
  if (!Array.isArray(images)) return []
  return images.filter(
    (item): item is string => typeof item === 'string' && !item.startsWith(COST_PRICE_FALLBACK_PREFIX),
  )
}

function attachCostPriceMetadata(images: unknown, costPrice?: number) {
  const cleanImages = stripCostPriceMetadata(images)

  if (costPrice === undefined || costPrice === null || !Number.isFinite(Number(costPrice))) {
    return cleanImages
  }

  return [...cleanImages, `${COST_PRICE_FALLBACK_PREFIX}${Number(costPrice).toFixed(2)}`]
}

function sanitizeDecimal(
  value: number | undefined,
  fieldName: string,
  options: { required?: boolean; min?: number } = {},
) {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new Error(`${fieldName} is required`)
    }
    return undefined
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number`)
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${fieldName} must be at least ${options.min}`)
  }

  if (parsed > MAX_DECIMAL_VALUE) {
    throw new Error(`${fieldName} is too large. Maximum allowed is ${MAX_DECIMAL_VALUE.toLocaleString()}`)
  }

  return Number(parsed.toFixed(2))
}

function sanitizeWholeNumber(
  value: number | undefined,
  fieldName: string,
  options: { required?: boolean; min?: number } = {},
) {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new Error(`${fieldName} is required`)
    }
    return undefined
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be a whole number`)
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${fieldName} must be at least ${options.min}`)
  }

  if (parsed > MAX_STOCK_VALUE) {
    throw new Error(`${fieldName} is too large. Maximum allowed is ${MAX_STOCK_VALUE.toLocaleString()}`)
  }

  return parsed
}

function extractMissingColumnName(errorMessage: string) {
  const quotedMatch = errorMessage.match(/column\s+["']([a-zA-Z0-9_]+)["']/i)
  if (quotedMatch?.[1]) return quotedMatch[1]

  const unquotedMatch = errorMessage.match(/column\s+([a-zA-Z0-9_]+)\s+/i)
  if (unquotedMatch?.[1]) return unquotedMatch[1]

  return null
}

function sanitizeProductForPublic(product: any) {
  if (!product) return product
  const { cost_price, ...rest } = product
  return rest
}

function normalizeProduct(product: any) {
  const safeImageUrl =
    typeof product?.image_url === 'string' && product.image_url.startsWith(COST_PRICE_FALLBACK_PREFIX)
      ? null
      : product?.image_url

  const rawImages = Array.isArray(product?.images)
    ? product.images.filter(Boolean)
    : safeImageUrl
      ? [safeImageUrl]
      : []

  const images = stripCostPriceMetadata(rawImages)

  const merchant = product?.merchant_profiles || product?.auth_users

  return {
    ...product,
    images,
    image_url: safeImageUrl ?? images[0] ?? null,
    stock: Number.isFinite(Number(product?.stock)) ? Number(product.stock) : 0,
    cost_price: Number.isFinite(Number(product?.cost_price)) ? Number(product.cost_price) : extractCostPriceFromImageMetadata(rawImages),
    status: product?.status ?? (product?.is_active === false ? 'inactive' : 'active'),
    merchant_profiles: merchant
      ? {
          ...merchant,
          id: merchant.id || product?.merchant_id || '',
          business_name: merchant.business_name || merchant.name || 'Unknown',
          logo_url: merchant.logo_url || merchant.avatar_url || null,
          distance_km: Number.isFinite(Number(merchant.distance_km)) ? Number(merchant.distance_km) : null,
        }
      : undefined,
  }
}

function buildBaseProductPayload(product: Partial<ProductInput>, options: { includeDefaults?: boolean } = {}) {
  return {
    ...(product.name !== undefined ? { name: product.name } : {}),
    ...(product.description !== undefined ? { description: product.description } : {}),
    ...(product.price !== undefined ? { price: product.price } : {}),
    ...(product.listing_currency !== undefined ? { listing_currency: product.listing_currency } : {}),
    ...(product.listing_price !== undefined ? { listing_price: product.listing_price } : {}),
    ...(product.cost_price !== undefined ? { cost_price: product.cost_price } : {}),
    ...(product.category !== undefined ? { category: product.category } : {}),
    ...(product.image_url !== undefined || product.images !== undefined
      ? { image_url: product.image_url || product.images?.[0] || null }
      : {}),
    ...(product.minimum_order_quantity !== undefined || options.includeDefaults ? { minimum_order_quantity: validateMoq(product.minimum_order_quantity) } : {}),
    ...(product.stock !== undefined ? { stock: product.stock } : options.includeDefaults ? { stock: 0 } : {}),
  }
}

function buildLegacyProductPayload(product: Partial<ProductInput>, options: { includeDefaults?: boolean } = {}) {
  const { cost_price, ...legacySafeProduct } = product
  const imagesWithMetadata = attachCostPriceMetadata(legacySafeProduct.images, cost_price)
  const firstVisibleImage = stripCostPriceMetadata(imagesWithMetadata)[0] ?? null
  const resolvedImageUrl = legacySafeProduct.image_url ?? firstVisibleImage ?? undefined

  return {
    ...buildBaseProductPayload(
      {
        ...legacySafeProduct,
        images: imagesWithMetadata,
        image_url: resolvedImageUrl,
      },
      options,
    ),
    ...(legacySafeProduct.images !== undefined && imagesWithMetadata.length > 0 ? { images: imagesWithMetadata } : {}),
  }
}

export async function getMerchantProducts(merchantId: string) {
  try {
    await requireMerchant(merchantId)
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, merchant_profiles:auth_users!merchant_id(id, business_name, business_category, business_description, name, city, state, location, avatar_url)')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
    if (error) throw error
    return { success: true, data: (data || []).map(normalizeProduct).filter((product) => product.status !== 'deleted') }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getAllProducts(options: {
  buyerLat?: number | null
  buyerLng?: number | null
  category?: string | null
  search?: string | null
  limit?: number
  page?: number
} = {}) {
  try {
    const supabase = await createClient()
    const pageSize = Math.min(Math.max(Number(options.limit) || 100, 1), 200)
    const page = Math.max(Number(options.page) || 1, 1)
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('products')
      .select('*, merchant_profiles:auth_users!merchant_id(id, business_name, business_category, business_description, name, city, state, location, avatar_url)', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Push category filter to DB — avoid loading products just to discard them
    if (options.category && options.category !== 'All') {
      query = (query as any).eq('category', options.category)
    }

    // Push text search to DB using ilike on name and description
    if (options.search && options.search.trim()) {
      const term = searchFilterValue(options.search)
      query = (query as any).or(`name.ilike.${term},description.ilike.${term}`)
    }

    query = (query as any).range(offset, offset + pageSize - 1)

    const { data, error, count } = await (query as any)
    if (error) throw error

    const normalizedProducts = (data || []).map(normalizeProduct)
    const productsWithDistance = await attachProductDistances(normalizedProducts, options.buyerLat, options.buyerLng)
    const sortedProducts = sortProductsByLocation(productsWithDistance)

    return {
      success: true,
      data: sortedProducts.map(sanitizeProductForPublic),
      total: count ?? null,
      page,
      pageSize,
    }
  } catch (error: any) {
    return { success: false, error: error.message, data: [], total: null, page: 1, pageSize: 100 }
  }
}

export async function getProductById(productId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, merchant_profiles:auth_users!merchant_id(id, business_name, business_category, business_description, name, city, state, location, avatar_url)')
      .eq('id', productId)
      .single()
    if (error) throw error

    const normalized = normalizeProduct(data)
    if (normalized.status === 'deleted' || normalized.is_active === false) {
      return { success: false, error: 'Product not found' }
    }

    const promotionPercentOff = await getPromotionPercentOffForProduct(
      String(normalized.merchant_id || normalized.merchant_profiles?.id || ''),
      String(normalized.id || ''),
      Number(normalized.price || 0),
    )

    return {
      success: true,
      data: {
        ...sanitizeProductForPublic(normalized),
        promotion_percent_off: promotionPercentOff,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createProduct(merchantId: string, product: ProductInput, actorId?: string) {
  try {
    actorId = await requireMerchant(merchantId)
    const supabase = await createClient()

    if (actorId && actorId !== merchantId) {
      return { success: false, error: 'You are not allowed to create products for this merchant.' }
    }

    if (typeof product.name !== 'string' || !product.name.trim()) throw new Error('Product name is required')
    const listingCurrency = product.listing_currency || 'NGN'
    if (!['NGN', 'CNY', 'USD'].includes(listingCurrency)) throw new Error('Unsupported listing currency')
    const listingPrice = sanitizeDecimal(product.price, 'Listing price', { required: true, min: 0.01 })!
    const normalizedProduct = {
      ...product,
      name: product.name?.trim(),
      price: sanitizeDecimal(convertCurrency(listingPrice, listingCurrency, 'NGN'), 'Product price', { required: true, min: 0.01 }),
      ...(product.listing_currency ? { listing_currency: listingCurrency, listing_price: listingPrice } : {}),
      cost_price: sanitizeDecimal(product.cost_price, 'Cost price', { required: true, min: 0 }),
      stock: sanitizeWholeNumber(product.stock, 'Stock quantity', { min: 0 }),
      weight: sanitizeDecimal(product.weight, 'Product weight', { min: 0 }),
    }

    const richPayload = {
      ...buildBaseProductPayload(normalizedProduct, { includeDefaults: true }),
      weight: normalizedProduct.weight,
      images: normalizedProduct.images,
      status: normalizedProduct.status ?? 'active',
      merchant_id: merchantId,
    }

    let result = await (supabase.from('products') as any).insert(richPayload).select().single()

    if (result.error && /minimum_order_quantity/.test(String(result.error.message))) throw new Error('Apply scripts/032-product-moq.sql before saving MOQ.')
    if (result.error && product.listing_currency && /listing_currency|listing_price/.test(String(result.error.message))) throw new Error('Apply scripts/030-product-listing-currency.sql before saving listing currencies.')
    if (result.error && String(result.error.message || '').includes('column')) {
      result = await (supabase.from('products') as any)
        .insert({ ...buildLegacyProductPayload(normalizedProduct), merchant_id: merchantId })
        .select()
        .single()
    }

    if (result.error) throw result.error
    return { success: true, data: normalizeProduct(result.data) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateProduct(productId: string, updates: Partial<ProductInput>, actorId?: string) {
  try {
    actorId = await requireMerchant(actorId)
    const supabase = await createClient()

    if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim())) throw new Error('Product name is required')
    if (updates.listing_price !== undefined) throw new Error('Supply price and listing_currency together to change a listing price.')
    if (updates.listing_currency !== undefined && (!['NGN','CNY','USD'].includes(updates.listing_currency) || updates.price === undefined)) throw new Error('Supply a valid listing currency and price together.')
    if (updates.price !== undefined && !updates.listing_currency) {
      const existing = await supabase.from('products').select('listing_currency').eq('id', productId).eq('merchant_id', actorId).single()
      if (existing.error || existing.data?.listing_currency !== 'NGN') throw new Error('Specify the original listing currency when changing this price.')
      updates = { ...updates, listing_currency: 'NGN' }
    }
    const normalizedUpdates = {
      ...updates,
      ...(updates.price !== undefined
        ? { listing_price: sanitizeDecimal(updates.price, 'Listing price', { min: 0.01 }), price: sanitizeDecimal(convertCurrency(updates.price!, updates.listing_currency || 'NGN', 'NGN'), 'Product price', { min: 0.01 }) }
        : {}),
      ...(updates.cost_price !== undefined
        ? { cost_price: sanitizeDecimal(updates.cost_price, 'Cost price', { min: 0 }) }
        : {}),
      ...(updates.minimum_order_quantity !== undefined ? { minimum_order_quantity: validateMoq(updates.minimum_order_quantity) } : {}),
      ...(updates.stock !== undefined
        ? { stock: sanitizeWholeNumber(updates.stock, 'Stock quantity', { min: 0 }) }
        : {}),
      ...(updates.weight !== undefined
        ? { weight: sanitizeDecimal(updates.weight, 'Product weight', { min: 0 }) }
        : {}),
    }

    const richUpdates = {
      ...buildBaseProductPayload(normalizedUpdates),
      ...(normalizedUpdates.is_active !== undefined ? { is_active: normalizedUpdates.is_active } : {}),
      ...(normalizedUpdates.cost_price !== undefined ? { cost_price: normalizedUpdates.cost_price } : {}),
      ...(normalizedUpdates.weight !== undefined ? { weight: normalizedUpdates.weight } : {}),
      ...(normalizedUpdates.images !== undefined ? { images: normalizedUpdates.images } : {}),
      ...(normalizedUpdates.status !== undefined ? { status: normalizedUpdates.status } : {}),
    }

    let richPayload = { ...richUpdates }
    let result: any = null
    let costPriceColumnUnavailable = false

    for (let attempt = 0; attempt < 8; attempt += 1) {
      let updateQuery = (supabase.from('products') as any).update(richPayload).eq('id', productId)
      if (actorId) updateQuery = updateQuery.eq('merchant_id', actorId)

      result = await updateQuery.select().single()
      if (!result.error) break

      const message = String(result.error.message || '')
      if (!message.includes('column')) break

      const missingColumn = extractMissingColumnName(message)
      if (!missingColumn || !(missingColumn in richPayload)) break

      // If cost_price itself is unavailable, switch to compatibility fallback for metadata storage.
      if (missingColumn === 'minimum_order_quantity') throw new Error('Apply scripts/032-product-moq.sql before saving MOQ.');
      if (missingColumn === 'listing_currency' || missingColumn === 'listing_price') throw new Error('Apply the product listing currency migration before changing prices.')
      if (missingColumn === 'cost_price' && normalizedUpdates.cost_price !== undefined) {
        costPriceColumnUnavailable = true
        break
      }

      delete (richPayload as any)[missingColumn]
      if (Object.keys(richPayload).length === 0) {
        return { success: false, error: 'No compatible fields available to update for this product.' }
      }
    }

    if (result.error && String(result.error.message || '').includes('column')) {
      let fallbackNormalizedUpdates = normalizedUpdates
      let canPersistCostWithImages = normalizedUpdates.images !== undefined

      // Preserve existing images when storing cost price in metadata fallback.
      if (normalizedUpdates.images === undefined && normalizedUpdates.cost_price !== undefined) {
        // Use select('*') so this read remains compatible whether `images` exists or not.
        let existingProductQuery = (supabase.from('products') as any)
          .select('*')
          .eq('id', productId)
        if (actorId) existingProductQuery = existingProductQuery.eq('merchant_id', actorId)
        const existingProductResult = await existingProductQuery.maybeSingle()

        if (!existingProductResult?.error && existingProductResult?.data) {
          const hasImagesColumn = Object.prototype.hasOwnProperty.call(existingProductResult.data, 'images')
          canPersistCostWithImages = hasImagesColumn

          fallbackNormalizedUpdates = {
            ...fallbackNormalizedUpdates,
            ...(hasImagesColumn
              ? {
                  images: Array.isArray(existingProductResult.data.images)
                    ? existingProductResult.data.images
                    : existingProductResult.data.image_url
                      ? [existingProductResult.data.image_url]
                      : [],
                }
              : {}),
            image_url: existingProductResult.data.image_url,
          }
        }
      }

      let fallbackPayload: Record<string, any> = {
        ...buildLegacyProductPayload(fallbackNormalizedUpdates),
        ...(normalizedUpdates.is_active !== undefined ? { is_active: normalizedUpdates.is_active } : {}),
      }

      for (let attempt = 0; attempt < 8; attempt += 1) {
        let fallbackQuery = (supabase.from('products') as any).update(fallbackPayload).eq('id', productId)
        if (actorId) fallbackQuery = fallbackQuery.eq('merchant_id', actorId)

        result = await fallbackQuery.select().single()
        if (!result.error) break

        const message = String(result.error.message || '')
        if (!message.includes('column')) break

        const missingColumn = extractMissingColumnName(message)
        if (!missingColumn || !(missingColumn in fallbackPayload)) break

        if (missingColumn === 'minimum_order_quantity') throw new Error('Apply scripts/032-product-moq.sql before saving MOQ.');
      if (missingColumn === 'listing_currency' || missingColumn === 'listing_price') throw new Error('Listing currency could not be saved. Apply the currency migration.')
        if (missingColumn === 'images') {
          canPersistCostWithImages = false
        }

        delete fallbackPayload[missingColumn]
        if (Object.keys(fallbackPayload).length === 0) {
          break
        }
      }

      if (!result.error && normalizedUpdates.cost_price !== undefined && costPriceColumnUnavailable && !canPersistCostWithImages) {
        return {
          success: false,
          error:
            'Cost price cannot be saved on this database schema yet. Please run scripts/013-add-product-cost-price.sql and retry.',
        }
      }
    }

    if (result.error) throw result.error
    return { success: true, data: normalizeProduct(result.data) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteProduct(productId: string, actorId?: string) {
  try {
    actorId = await requireMerchant(actorId)
    const supabase = await createClient()
    let query = supabase.from('products').delete().eq('id', productId)
    if (actorId) query = query.eq('merchant_id', actorId)

    const { error } = await query

    if (!error) {
      return { success: true, deleted: true, message: 'Product deleted successfully' }
    }

    const errorMessage = String(error.message || '')
    const hasReferenceConstraint = /foreign key|violates.*constraint|order_items_product_id_fkey/i.test(errorMessage)

    if (!hasReferenceConstraint) {
      throw error
    }

    const softDeleteAttempts = [
      { is_active: false, status: 'deleted', stock: 0, updated_at: new Date().toISOString() },
      { is_active: false, stock: 0, updated_at: new Date().toISOString() },
      { is_active: false, stock: 0 },
      { status: 'deleted' },
    ]

    let archived = false
    let lastSoftDeleteError: any = null

    for (const payload of softDeleteAttempts) {
      let updateQuery = (supabase.from('products') as any).update(payload).eq('id', productId)
      if (actorId) updateQuery = updateQuery.eq('merchant_id', actorId)

      const result = await updateQuery.select('id').maybeSingle()
      if (!result.error) {
        archived = true
        break
      }
      lastSoftDeleteError = result.error
    }

    if (!archived && lastSoftDeleteError) {
      throw lastSoftDeleteError
    }

    return {
      success: true,
      archived: true,
      message: 'Product removed from active listings. Existing orders were preserved.',
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function requestWeightVerification(productId: string) {
  return { success: true, message: 'Verification requested' }
}
