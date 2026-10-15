import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { createClient } from '@/lib/supabase/server'

const table = 'merchant_payment_accounts'
const fields = 'id,country_code,currency_code,institution_name,account_holder_name,account_number,branch_name,routing_code_type,routing_code,is_default,created_at,updated_at'

async function merchant(request: NextRequest) {
 const auth = await requireAuthenticatedUser(undefined, request)
 if (auth.response) return { response: auth.response, id: null }
 const id = auth.user!.id as string
 const { data, error } = await createClient().from('auth_users').select('role').eq('id', id).single()
 if (error || data?.role !== 'merchant') return { response: NextResponse.json({success:false,error:'Merchant access required'}, {status:403}), id:null }
 return { response:null, id }
}

function parse(input: any) {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid account details')
 const country_code = String(input.country_code || '').toUpperCase()
 if (!['NG','CN'].includes(country_code)) throw Error('Only Nigeria and China are supported')
 const currency_code = country_code === 'NG' ? 'NGN' : 'CNY'
 const institution_name = String(input.institution_name || '').trim()
 const account_holder_name = String(input.account_holder_name || '').trim()
 const account_number = String(input.account_number || '').replace(/\s/g,'')
 const branch_name = String(input.branch_name || '').trim() || null
 const routing_code_type = input.routing_code_type ? String(input.routing_code_type).toUpperCase() : null
 const routing_code = input.routing_code ? String(input.routing_code).trim().toUpperCase() : null
 if (!institution_name || institution_name.length > 150 || !account_holder_name || account_holder_name.length > 150) throw Error('Bank and account holder names are required (maximum 150 characters)')
 if (country_code === 'NG' && !/^\d{10}$/.test(account_number)) throw Error('Nigerian account number must contain 10 digits')
 if (country_code === 'CN' && !/^\d{8,34}$/.test(account_number)) throw Error('Enter a valid numeric Chinese account identifier')
 if (branch_name && branch_name.length > 150) throw Error('Branch name is too long')
 if ((routing_code_type === null) !== (routing_code === null)) throw Error('Provide both routing code type and code')
 if (routing_code_type && !['SWIFT','CNAPS'].includes(routing_code_type)) throw Error('Unsupported routing code type')
 if (routing_code_type === 'SWIFT' && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(routing_code!)) throw Error('SWIFT/BIC must contain 8 or 11 characters')
 if (routing_code_type === 'CNAPS' && !/^\d{12}$/.test(routing_code!)) throw Error('CNAPS must contain 12 digits')
 return { country_code,currency_code,institution_name,account_holder_name,account_number,branch_name,routing_code_type,routing_code }
}

export async function GET(request: NextRequest) {
 const auth = await merchant(request)
 if (auth.response) return auth.response
 const { data,error } = await createClient().from(table).select(fields).eq('merchant_id',auth.id).order('created_at',{ascending:false})
 if (error) return NextResponse.json({success:false,error:'Unable to load payment accounts'}, {status:500})
 return NextResponse.json({success:true,data})
}

export async function POST(request: NextRequest) {
 const auth = await merchant(request)
 if (auth.response) return auth.response
 let details
 try { details = parse(await request.json()) } catch(e) { return NextResponse.json({success:false,error:e instanceof Error ? e.message : 'Invalid request'}, {status:400}) }
 const db = createClient()
 const {data:existing,error:lookupError} = await db.from(table).select('id').eq('merchant_id',auth.id).limit(1)
 if (lookupError) return NextResponse.json({success:false,error:'Unable to check existing accounts'}, {status:500})
 const {data,error} = await db.from(table).insert({...details,merchant_id:auth.id,is_default:!existing?.length}).select(fields).single()
 if (error) return NextResponse.json({success:false,error:'Unable to save payment account'}, {status:500})
 return NextResponse.json({success:true,data}, {status:201})
}

export async function PATCH(request: NextRequest) {
 const auth = await merchant(request)
 if (auth.response) return auth.response
 let body: any
 try { body = await request.json() } catch { return NextResponse.json({success:false,error:'Invalid JSON'}, {status:400}) }
 const id = String(body?.id || '')
 if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({success:false,error:'Valid account ID required'}, {status:400})
 const db = createClient()
 const {data:owned} = await db.from(table).select('id').eq('id',id).eq('merchant_id',auth.id).maybeSingle()
 if (!owned) return NextResponse.json({success:false,error:'Account not found'}, {status:404})
 if (body?.set_default === true) {
  const {error} = await db.rpc('set_merchant_default_payment_account',{p_merchant_id:auth.id,p_account_id:id})
  if (error) return NextResponse.json({success:false,error:'Could not change default account'}, {status:500})
  return NextResponse.json({success:true})
 }
 let details
 try { details = parse(body) } catch(e) { return NextResponse.json({success:false,error:e instanceof Error ? e.message : 'Invalid request'}, {status:400}) }
 const {data,error} = await db.from(table).update({...details,updated_at:new Date().toISOString()}).eq('id',id).eq('merchant_id',auth.id).select(fields).single()
 if (error) return NextResponse.json({success:false,error:'Could not update account'}, {status:500})
 return NextResponse.json({success:true,data})
}

export async function DELETE(request: NextRequest) {
 const auth = await merchant(request)
 if (auth.response) return auth.response
 const id = request.nextUrl.searchParams.get('id') || ''
 if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({success:false,error:'Valid account ID required'}, {status:400})
 const db = createClient()
 const {data:owned} = await db.from(table).select('id,is_default').eq('id',id).eq('merchant_id',auth.id).maybeSingle()
 if (!owned) return NextResponse.json({success:false,error:'Account not found'}, {status:404})
 if (owned.is_default) return NextResponse.json({success:false,error:'Select another default account before deleting this one'}, {status:409})
 const {error} = await db.from(table).delete().eq('id',id).eq('merchant_id',auth.id)
 if (error) return NextResponse.json({success:false,error:'Could not remove account'}, {status:500})
 return NextResponse.json({success:true})
}
