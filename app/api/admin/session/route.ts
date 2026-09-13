import { NextRequest, NextResponse } from 'next/server'
import { AdminAccessError, adminCookie, requireAdminSession, scopeForAccessCode, signAdminSession } from '@/lib/admin-session'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { ipAddress } from '@vercel/functions'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
 if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
 try {
  const clientIp = ipAddress(request) || 'unknown'
  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32) return NextResponse.json({ code: 'CONFIGURATION_REQUIRED', error: 'Admin session configuration is missing. Contact the platform owner.' }, { status: 503 })
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return NextResponse.json({ error: 'Admin rate limiting is not configured.' }, { status: 503 })
  const limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5, '10 m'), prefix: 'bigcat:admin-code' })
  if (!(await limiter.limit(clientIp)).success) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  const { code } = await request.json()
  if (typeof code !== 'string' || code.length > 256) return NextResponse.json({ error: 'Invalid access code.' }, { status: 400 })
  const scope = scopeForAccessCode(code)
  if (!scope) return NextResponse.json({ error: 'Invalid access code.' }, { status: 403 })
  const response = NextResponse.json({ redirect: '/admin/' + scope })
  response.cookies.set(adminCookie, signAdminSession(scope), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 3600 })
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
