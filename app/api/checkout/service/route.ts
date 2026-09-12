import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/supabase/authorize'
import { requirePilotMode } from '@/lib/pilot-config'
import { createClient } from '@/lib/supabase/server'
export async function POST(request: Request) {
 try {
  requirePilotMode()
  const actor = await requireActor(undefined, ['buyer'])
  const body = await request.json()
  const {data,error} = await createClient().rpc('pilot_service_checkout',{p_buyer:actor.id,p_key:body.idempotencyKey,p_payload:{billId:body.billId||null,serviceId:body.serviceId||null,address:body.address,outcome:body.outcome,scheduledAt:body.scheduledAt||null,note:body.note||null}})
  if (error) throw error
  return NextResponse.json(data)
 } catch(e: any) { return NextResponse.json({success:false,error:e.message},{status:400}) }
}
