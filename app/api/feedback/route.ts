import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(undefined, request)
  if (auth.response) return auth.response
  try {
    const body = await request.json()
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!['bug','confusion','suggestion'].includes(body.category) || !description || description.length > 5000 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id || '')) {
      return NextResponse.json({ success: false, error: 'Choose a feedback topic and enter 1–5000 characters.' }, { status: 400 })
    }
    const db = createClient()
    const existing = await db.from('pilot_feedback').select('id, user_id, category, description').eq('id', body.id).maybeSingle()
    if (existing.error) throw existing.error
    if (existing.data) {
      if (existing.data.user_id !== auth.user.id || existing.data.category !== body.category || existing.data.description !== description) return NextResponse.json({ success: false, error: 'Feedback reference conflict.' }, { status: 409 })
      return NextResponse.json({ success: true, id: body.id })
    }
    const { error } = await db.from('pilot_feedback').insert({ id: body.id, user_id: auth.user.id, category: body.category, description })
    if (error) throw error
    return NextResponse.json({ success: true, id: body.id })
  } catch {
    return NextResponse.json({ success: false, error: 'Feedback could not be saved. Please retry or contact support.' }, { status: 503 })
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const { data, error } = await createClient().from('pilot_feedback').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: 'Admin access and configured feedback storage are required.' }, { status: 403 })
  }
}
