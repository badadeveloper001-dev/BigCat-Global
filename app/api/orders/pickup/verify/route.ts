import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/supabase/authorize'
export async function POST() {
 try {
  await requireActor(undefined, ['admin'])
  return NextResponse.json({ success: false, error: 'Pilot pickup completion requires buyer confirmation in the order page.' }, { status: 409 })
 } catch { return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 }) }
}
