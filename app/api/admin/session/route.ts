import { NextRequest, NextResponse } from 'next/server'
import { AdminAccessError, adminCookie, adminIdentity, allowedRole, equalSecret, requireAdminSession, scopes, signAdminSession } from '@/lib/admin-session'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
 if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
 try {
  const identity = await adminIdentity()
  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32) return NextResponse.json({ code: 'CONFIGURATION_REQUIRED', error: 'Admin session configuration is missing. Contact the platform owner.' }, { status: 503 })
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return NextResponse.json({ error: 'Admin rate limiting is not configured.' }, { status: 503 })
  const limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5, '10 m'), prefix: 'bigcat:admin-code' })
  if (!(await limiter.limit(identity.id)).success) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  const { code } = await request.json()
  if (typeof code !== 'string' || code.length > 256) return NextResponse.json({ error: 'Invalid access code.' }, { status: 400 })
  const names = { bigcat: 'ADMIN_BIGCAT_ACCESS_CODE', orchid: 'ADMIN_ORCHID_ACCESS_CODE', 'trade-logistics': 'ADMIN_LOGISTICS_ACCESS_CODE' }
  const permitted = scopes.filter(value => allowedRole(identity.role, value))
  if (!permitted.some(value => (process.env[names[value]] || '').length >= 16)) return NextResponse.json({ code: 'CONFIGURATION_REQUIRED', error: 'Configure an admin access code of at least 16 characters for this account role.' }, { status: 503 })
  const scope = scopes.find(value => { const expected = process.env[names[value]]; return expected && expected.length >= 16 && allowedRole(identity.role, value) && equalSecret(code, expected) })
  if (!scope) return NextResponse.json({ error: 'Invalid access code or account permissions.' }, { status: 403 })
  const response = NextResponse.json({ redirect: '/admin/' + scope })
  response.cookies.set(adminCookie, signAdminSession(identity.id, scope), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 3600 })
  return response
 } catch (error) {
  if (error instanceof AdminAccessError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status })
  return NextResponse.json({ code: 'SERVICE_UNAVAILABLE', error: 'Admin verification service is unavailable. Check the Upstash connection and server settings.' }, { status: 503 })
 }
}
export async function GET() {
 try { const session = await requireAdminSession(); return NextResponse.json({ scope: session.scope }, { headers: { 'Cache-Control': 'no-store' } }) }
 catch { return NextResponse.json({ error: 'Admin access required.' }, { status: 401 }) }
}
export async function DELETE(request: NextRequest) {
 if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
 const response = NextResponse.json({ success: true }); response.cookies.set(adminCookie, '', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 }); return response
}
