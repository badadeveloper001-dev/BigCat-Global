import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

const BUCKET = 'merchant-verification-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId')
    if (!userId) return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })

    const auth = await requireAuthenticatedUser(userId, request)
    if (auth.response) return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: auth.response.status })

    const admin = createClient()
    const { data, error } = await admin
      .from('merchant_verifications')
      .select('id, country, registration_number, document_type, document_url, status, submitted_at, rejection_reason')
      .eq('merchant_id', userId)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Merchant verification GET error:', error)
    return NextResponse.json({ success: false, error: 'Unable to load verification status' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })

    const auth = await requireAuthenticatedUser(userId, request)
    if (auth.response) return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: auth.response.status })

    const formData = await request.formData()
    const country = String(formData.get('country') || '').trim().toUpperCase()
    const registrationNumber = String(formData.get('registrationNumber') || '').trim()
    if (!['NG', 'CN'].includes(country)) return NextResponse.json({ success: false, error: 'A supported business country is required' }, { status: 400 })
    if (!registrationNumber) return NextResponse.json({ success: false, error: 'Business registration number is required' }, { status: 400 })

    const file = formData.get('document')
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: 'Verification document is required' }, { status: 400 })

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Document must be between 1 byte and 10MB' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Only PDF, JPG, and PNG documents are accepted' }, { status: 400 })
    }

    const admin = createClient()
    const { data: verification, error: lookupError } = await admin
      .from('merchant_verifications')
      .select('id, country, document_type, status')
      .eq('merchant_id', userId)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (verification?.status === 'verified') return NextResponse.json({ success: false, error: 'This business is already verified' }, { status: 409 })

    const documentType = country === 'CN' ? 'business_license' : 'cac_certificate'
    if (verification && verification.document_type !== documentType) {
      return NextResponse.json({ success: false, error: 'Business country does not match the existing verification record' }, { status: 409 })
    }

    const extension = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'
    const path = `${userId}/${documentType}-${crypto.randomUUID()}.${extension}`
    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) throw uploadError

    const verificationUpdate = {
      country,
      registration_number: registrationNumber,
      document_type: documentType,
      document_url: path,
      status: 'submitted',
        submitted_at: new Date().toISOString(),
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    }

    const { error: verificationError } = verification
      ? await admin.from('merchant_verifications').update(verificationUpdate).eq('merchant_id', userId)
      : await admin.from('merchant_verifications').insert({ merchant_id: userId, ...verificationUpdate })

    if (verificationError) {
      await admin.storage.from(BUCKET).remove([path])
      throw verificationError
    }

    return NextResponse.json({ success: true, data: { status: 'submitted', documentType, country, registrationNumber } })
  } catch (error) {
    console.error('Merchant verification upload error:', error)
    return NextResponse.json({ success: false, error: 'Unable to submit verification document' }, { status: 500 })
  }
}
