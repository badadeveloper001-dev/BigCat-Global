import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { getPlatformStats, getLogisticsStats, getMerchantStats, getTransactionStats } from '@/lib/admin-actions'

export async function GET(request: NextRequest) {
  const adminAuth = await requireAdminUser(request)
  if (adminAuth.response) return adminAuth.response

  try {
    const [platformResult, logisticsResult, merchantResult, transactionResult] = await Promise.all([
      getPlatformStats(),
      getLogisticsStats(),
      getMerchantStats(),
      getTransactionStats(),
    ])

    return NextResponse.json({
      success: true,
      platform: platformResult.success ? { available: true, ...platformResult.stats } : { available: false, error: platformResult.error },
      logistics: logisticsResult.success ? { available: true, ...logisticsResult.data } : { available: false, error: logisticsResult.error },
      merchants: merchantResult.success ? { available: true, ...merchantResult.data } : { available: false, error: merchantResult.error },
      transactions: transactionResult.success ? { available: true, ...transactionResult.data } : { available: false, error: transactionResult.error },
    })
  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
