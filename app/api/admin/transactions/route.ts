import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { getTransactions, getTransactionStats } from '@/lib/admin-actions'

export async function GET(request: NextRequest) {
  const adminAuth = await requireAdminUser(request)
  if (adminAuth.response) return adminAuth.response

  try {
    const [txnResult, statsResult] = await Promise.all([
      getTransactions(),
      getTransactionStats(),
    ])

    const transactions = txnResult.success ? txnResult.data.map((transaction: any) => ({
      id: transaction.id,
      orderId: transaction.order_id || null,
      user: transaction.buyer_id || 'Unknown',
      buyerId: transaction.buyer_id || null,
      amount: Number(transaction.amount || 0),
      status: transaction.status || 'pending',
      date: transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : '',
      createdAt: transaction.created_at,
      type: transaction.type || 'unknown',
      reason: transaction.reason || null,
    })) : []

    const raw = statsResult.success ? statsResult.data : null

    const stats = {
      totalTransactions: raw?.totalTransactions ?? null,
      totalRevenue: raw?.totalRevenue ?? null,
      productEscrow: raw?.productEscrow ?? null,
      deliveryEscrow: raw?.deliveryEscrow ?? null,
      totalEscrow: raw?.totalEscrow ?? null,
      completedPayments: raw?.successful ?? null,
      pendingPayments: raw?.pending ?? null,
      pendingOrders: raw?.pendingOrders ?? null,
      completedOrders: raw?.completedOrders ?? null,
      disbursedAmount: raw?.disbursedAmount ?? null,
      transactionLedgerAvailable: raw?.transactionLedgerAvailable ?? false,
      escrowAvailable: raw?.escrowAvailable ?? false,
      revenueBasis: raw?.revenueBasis || null,
      testingMode: true,
    }

    return NextResponse.json({ success: true, transactions, stats, ledgerAvailable: txnResult.success, ledgerError: txnResult.success ? null : txnResult.error })
  } catch (error) {
    console.error('Admin transactions API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
