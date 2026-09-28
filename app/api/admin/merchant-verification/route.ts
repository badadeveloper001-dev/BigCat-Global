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

    const { data, error } = await supabase
      .from('merchant_verifications')
      .select('id, merchant_id, country, registration_number, document_type, status, submitted_at, rejection_reason, created_at, updated_at, auth_users!merchant_verifications_merchant_id_fkey(business_name, full_name, email)')
      .eq('status', status)
      .order('submitted_at', { ascending: false, nullsFirst: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('Admin merchant verification GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Unable to load merchant verifications.', data: [] },
      { status: error?.message?.includes('Admin access') ? 403 : 500 },
    )
  }
}
