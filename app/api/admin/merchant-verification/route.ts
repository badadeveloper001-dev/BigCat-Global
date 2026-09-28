import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin('bigcat')
    const supabase = createClient()
    const status = new URL(request.url).searchParams.get('status') || 'submitted'

    if (!['pending', 'submitted', 'verified', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid verification status.' }, { status: 400 })
    }

    const { data: verifications, error: verificationError } = await supabase
      .from('merchant_verifications')
      .select('id, merchant_id, country, registration_number, document_type, document_url, status, submitted_at, rejection_reason, created_at, updated_at')
      .eq('status', status)
      .order('submitted_at', { ascending: false, nullsFirst: false })

    if (verificationError) throw verificationError

    const merchantIds = (verifications || []).map((verification) => verification.merchant_id)
    let merchants: any[] = []

    if (merchantIds.length > 0) {
      const { data, error } = await supabase
        .from('auth_users')
        .select('id, business_name, full_name, email')
        .in('id', merchantIds)
        .eq('role', 'merchant')

      if (error) throw error
      merchants = data || []
    }

    const merchantById = new Map(merchants.map((merchant) => [merchant.id, merchant]))

    const data = (verifications || []).map((verification) => ({
      ...verification,
      merchant: merchantById.get(verification.merchant_id) || null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Admin merchant verification GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Unable to load merchant verifications.', data: [] },
      { status: error?.message?.includes('Admin access') ? 403 : 500 },
    )
  }
}
