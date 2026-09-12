import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/revenue-report?format=csv|json
// Returns platform revenue breakdown for download

export async function GET(request: NextRequest) {
  const adminAuth = await requireAdminUser(request)
  if (adminAuth.response) return adminAuth.response

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'csv'
  const period = searchParams.get('period') || '30d'  // 30d, 90d, all

  try {
    const supabase = await createClient()

    const periodDate = new Date()
    if (period === '30d') periodDate.setDate(periodDate.getDate() - 30)
    else if (period === '90d') periodDate.setDate(periodDate.getDate() - 90)
    else periodDate.setFullYear(2000) // "all" - go back far

    const selectAttempts = [
      'id, created_at, status, grand_total, product_total, delivery_fee, merchant_id, buyer_id, payment_status, escrow_status',
      'id, created_at, status, grand_total, product_total, delivery_fee, merchant_id, buyer_id, escrow_status',
      'id, created_at, status, grand_total, product_total, delivery_fee, merchant_id, buyer_id',
      'id, created_at, status, total_amount, delivery_fee, merchant_id, buyer_id',
      'id, created_at, status, grand_total, merchant_id, buyer_id',
    ]

    let orders: any[] = []
    let lastError: any = null

    for (const selectClause of selectAttempts) {
      const result = await (supabase.from('orders') as any)
        .select(selectClause)
        .gte('created_at', periodDate.toISOString())
        .order('created_at', { ascending: false })

      if (!result.error) {
        orders = result.data || []
        lastError = null
        break
      }

      lastError = result.error
      const message = String(result.error?.message || '').toLowerCase()
      if (!message.includes('column') && !message.includes('schema cache') && !message.includes('does not exist')) {
        throw result.error
      }
    }

    if (lastError && orders.length === 0) {
      throw lastError
    }

    const rows = (orders || []) as any[]

    const orderValue = (order: any) => Number(order.grand_total || order.total_amount || 0)
    const isRecognized = (order: any) => {
      const orderStatus = String(order.status || '').toLowerCase()
      const paymentStatus = String(order.payment_status || '').toLowerCase()
      const escrowStatus = String(order.escrow_status || '').toLowerCase()
      return paymentStatus === 'completed'
        || escrowStatus === 'released'
        || orderStatus === 'delivered'
        || orderStatus === 'completed'
    }

    const recognizedOrders = rows.filter(isRecognized)
    const pendingOrders = rows.filter((order: any) => !isRecognized(order) && !['cancelled', 'refunded', 'failed'].includes(String(order.status || '').toLowerCase()))
    const submittedOrderValue = rows.reduce((sum: number, order: any) => sum + orderValue(order), 0)
    const recognizedRevenue = recognizedOrders.reduce((sum: number, order: any) => sum + orderValue(order), 0)
    const recognizedDeliveryFees = recognizedOrders.reduce((sum: number, order: any) => sum + Number(order.delivery_fee || 0), 0)
    const configuredFeeRate = Number(process.env.PLATFORM_FEE_RATE)
    const platformFeeRate = Number.isFinite(configuredFeeRate) && configuredFeeRate >= 0 ? configuredFeeRate : null
    const estimatedPlatformFee = platformFeeRate === null
      ? null
      : recognizedOrders.reduce(
          (sum: number, order: any) => sum + Number(order.product_total || Math.max(0, orderValue(order) - Number(order.delivery_fee || 0))),
          0,
        ) * platformFeeRate

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        period,
        generatedAt: new Date().toISOString(),
        summary: {
          totalOrders: rows.length,
          recognizedOrders: recognizedOrders.length,
          pendingOrders: pendingOrders.length,
          submittedOrderValue,
          recognizedRevenue,
          recognizedDeliveryFees,
          estimatedPlatformFee,
          platformFeeRate,
          testingMode: true,
          revenueBasis: 'completed_payment_or_fulfilled_order',
        },
        orders: rows.map((o: any) => ({
          orderId: o.id,
          date: o.created_at,
          status: o.status,
          grandTotal: o.grand_total,
          totalAmount: o.total_amount,
          productTotal: o.product_total,
          deliveryFee: o.delivery_fee,
          merchantId: o.merchant_id,
          buyerId: o.buyer_id,
        })),
      })
    }

    // CSV format
    const csvHeader = 'Order ID,Date,Order Status,Payment Status,Escrow Status,Recognized,Grand Total (₦),Product Total (₦),Delivery Fee (₦),Merchant ID,Buyer ID'
    const csvRows = rows.map((order: any) => [
      order.id,
      new Date(order.created_at).toISOString(),
      order.status || '',
      order.payment_status || '',
      order.escrow_status || '',
      isRecognized(order) ? 'yes' : 'no',
      orderValue(order).toFixed(2),
      Number(order.product_total || Math.max(0, orderValue(order) - Number(order.delivery_fee || 0))).toFixed(2),
      Number(order.delivery_fee || 0).toFixed(2),
      order.merchant_id || '',
      order.buyer_id || '',
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))

    const summaryRows = [
      '',
      'SUMMARY',
      `Report Period,${period}`,
      `Generated At,${new Date().toISOString()}`,
      'Testing Mode,true',
      `Total Orders,${rows.length}`,
      `Recognized Orders,${recognizedOrders.length}`,
      `Pending Orders,${pendingOrders.length}`,
      `Submitted Order Value (₦),${submittedOrderValue.toFixed(2)}`,
      `Recognized Revenue (₦),${recognizedRevenue.toFixed(2)}`,
      `Recognized Delivery Fees (₦),${recognizedDeliveryFees.toFixed(2)}`,
      `Configured Platform Fee Rate,${platformFeeRate === null ? 'Not configured' : platformFeeRate}`,
      `Estimated Platform Fee (₦),${estimatedPlatformFee === null ? 'Unavailable' : estimatedPlatformFee.toFixed(2)}`,
    ]

    const csv = [csvHeader, ...csvRows, ...summaryRows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="bigcat-revenue-report-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Revenue report API error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
