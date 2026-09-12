import 'server-only'
import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/supabase/authorize'
import { createClient } from '@/lib/supabase/server'
import { requirePilotMode, TEST_FX_RATES } from '@/lib/pilot-config'
export async function readPilotWallet(request: Request) {
 try {
  requirePilotMode()
  const actor = await requireActor()
  const params = new URL(request.url).searchParams
  const requested = params.get('userId') || params.get('merchantId')
  if (requested && requested !== actor.id) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
  const db = createClient()
  const [wallets, transactions] = await Promise.all([db.from('user_wallets').select('*').eq('user_id',actor.id), db.from('wallet_transactions').select('*').eq('user_id',actor.id).order('created_at',{ascending:false}).limit(50)])
  if (wallets.error || transactions.error) throw wallets.error || transactions.error
  const rows = Object.keys(TEST_FX_RATES).map(currency => wallets.data?.find(w => w.currency === currency) || { currency, balance: 0, locked_balance: 0 })
  return NextResponse.json({ success:true, isTest:true, wallets:rows, balance:Number(rows.find(w => w.currency==='NGN')?.balance || 0), transactions:transactions.data, withdrawals:[] })
 } catch (e: any) { return NextResponse.json({ success:false, error:e.message },{status:400}) }
}
export async function changePilotWallet(request: Request, conversion=false) {
 try {
  requirePilotMode()
  const actor = await requireActor()
  const body = await request.json()
  const requested = body.userId || body.buyerId || body.merchantId
  if (requested && requested !== actor.id) return NextResponse.json({success:false,error:'Access denied'},{status:403})
  if (typeof body.idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(body.idempotencyKey)) throw new Error('A wallet request ID is required')
  const amount = Number(body.amount)
  const currency = conversion ? body.fromCurrency : body.currency || 'NGN'
  if (!Number.isFinite(amount) || amount<=0 || amount>1000000 || !Object.hasOwn(TEST_FX_RATES, currency)) throw new Error('Invalid test amount or currency')
  if (conversion && (!Object.hasOwn(TEST_FX_RATES, body.toCurrency) || body.toCurrency===currency)) throw new Error('Invalid test currency')
  const {data,error} = await createClient().rpc('pilot_wallet_change',{p_user_id:actor.id,p_currency:currency,p_amount:amount,p_key:body.idempotencyKey,p_target:conversion?body.toCurrency:null})
  if (error) throw error
  return NextResponse.json({...data, currency, amount})
 } catch (e: any) { return NextResponse.json({success:false,error:e.message},{status:400}) }
}
