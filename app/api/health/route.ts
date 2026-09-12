import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
export async function GET() {
 try {
  if(process.env.PAYMENT_MODE!=='test') throw new Error('Pilot mode unavailable')
  const {error}=await createClient().from('pilot_attempts').select('request_key').limit(0)
  if(error) throw error
  return NextResponse.json({status:'ok',paymentMode:'test'},{headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
