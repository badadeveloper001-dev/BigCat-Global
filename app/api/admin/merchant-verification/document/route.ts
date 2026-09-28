import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual, createHash } from 'node:crypto'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const REVIEW_COOKIE = 'bigcat_admin_verification_review'
const BUCKET = 'merchant-verification-documents'

function equalSecret(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}

function reviewSecret() {
  const value = process.env.ADMIN_SESSION_SECRET
  if (!value || value.length < 32) throw new Error('Admin session configuration is missing.')
  return value
}

function requireReviewAccess(token: string) {
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) throw new Error('Review access required.')
  const expected = createHmac('sha256', reviewSecret()).update('review:' + payload).digest('base64url')
  if (!equalSecret(signature, expected)) throw new Error('Review access required.')
  const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (session?.purpose !== 'merchant-verification-review' || !Number.isFinite(session?.expires) || session.expires <= Date.now()) {
    throw new Error('Review access has expired. Verify again to continue.')
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin('bigcat')
    requireReviewAccess((await cookies()).get(REVIEW_COOKIE)?.value || '')

    const verificationId = new URL(request.url).searchParams.get('verificationId')
    if (!verificationId) return NextResponse.json({ success: false, error: 'Verification ID is required.' }, { status: 400 })

    const supabase = createClient()
    const { data: verification, error: verificationError } = await supabase
      .from('merchant_verifications')
      .select('id, merchant_id, country, registration_number, document_type, document_url, status, submitted_at')
      .eq('id', verificationId)
      .maybeSingle()

    if (verificationError) throw verificationError
    if (!verification) return NextResponse.json({ success: false, error: 'Business verification record not found.' }, { status: 404 })
    if (verification.status !== 'submitted') return NextResponse.json({ success: false, error: 'This business verification is not awaiting review.' }, { status: 409 })
    if (!verification.document_url) return NextResponse.json({ success: false, error: 'No verification document is attached.' }, { status: 404 })

    const { data: signed, error: signedUrlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(verification.document_url, 5 * 60)

    if (signedUrlError || !signed?.signedUrl) throw signedUrlError || new Error('Unable to create document preview URL.')

    return NextResponse.json({
      success: true,
      data: {
        verificationId: verification.id,
        country: verification.country,
        registrationNumber: verification.registration_number,
        documentType: verification.document_type,
        submittedAt: verification.submitted_at,
        signedUrl: signed.signedUrl,
        expiresIn: 300,
      },
    })
  } catch (error: any) {
    const message = error?.message || 'Unable to open verification document.'
    return NextResponse.json({ success: false, error: message }, { status: message.includes('access required') || message.includes('expired') ? 403 : 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin('bigcat')
    requireReviewAccess((await cookies()).get(REVIEW_COOKIE)?.value || '')

    if (request.headers.get('origin') !== request.nextUrl.origin) {
      return NextResponse.json({ success: false, error: 'Invalid origin.' }, { status: 403 })
    }

    const body = await request.json()
    const verificationId = typeof body?.verificationId === 'string' ? body.verificationId : ''
    const action = body?.action === 'approve' || body?.action === 'reject' ? body.action : ''
    const rejectionReason = typeof body?.rejectionReason === 'string' ? body.rejectionReason.trim() : ''

    if (!verificationId || !action) return NextResponse.json({ success: false, error: 'Verification ID and action are required.' }, { status: 400 })
    if (action === 'reject' && !rejectionReason) return NextResponse.json({ success: false, error: 'A rejection reason is required.' }, { status: 400 })
    if (rejectionReason.length > 1000) return NextResponse.json({ success: false, error: 'Rejection reason is too long.' }, { status: 400 })

    const supabase = createClient()
    const { data: verification, error: lookupError } = await supabase
      .from('merchant_verifications')
      .select('id, merchant_id, status')
      .eq('id', verificationId)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (!verification) return NextResponse.json({ success: false, error: 'Business verification record not found.' }, { status: 404 })
    if (verification.status !== 'submitted') return NextResponse.json({ success: false, error: 'This business verification is no longer awaiting review.' }, { status: 409 })

    const nextStatus = action === 'approve' ? 'verified' : 'rejected'
    const { error: updateError } = await supabase
      .from('merchant_verifications')
      .update({
        status: nextStatus,
        rejection_reason: action === 'reject' ? rejectionReason : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verificationId)
      .eq('status', 'submitted')

    if (updateError) throw updateError

    if (action === 'approve') {
      const { error: merchantUpdateError } = await supabase
        .from('auth_users')
        .update({ setup_completed: true })
        .eq('id', verification.merchant_id)
        .eq('role', 'merchant')

      if (merchantUpdateError) throw merchantUpdateError
    }

    return NextResponse.json({ success: true, data: { status: nextStatus } })
  } catch (error: any) {
    const message = error?.message || 'Unable to update business verification.'
    return NextResponse.json({ success: false, error: message }, { status: message.includes('access required') || message.includes('expired') ? 403 : 500 })
  }
}
