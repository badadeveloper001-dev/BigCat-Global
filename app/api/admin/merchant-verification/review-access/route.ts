import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual, createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { requireAdminSession, scopeForAccessCode } from '@/lib/admin-session'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { ipAddress } from '@vercel/functions'

export const runtime = 'nodejs'

const REVIEW_COOKIE = 'bigcat_admin_verification_review'
const REVIEW_TTL_SECONDS = 10 * 60

function equalSecret(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}

function reviewSecret() {
  const value = process.env.ADMIN_SESSION_SECRET
  if (!value || value.length < 32) throw new Error('Admin session configuration is missing.')
  return value
}

function signReviewToken(adminSessionToken: string) {
  const sessionBinding = createHash('sha256').update(adminSessionToken).digest('base64url')
  const payload = Buffer.from(JSON.stringify({
    purpose: 'merchant-verification-review',
    sessionBinding,
    expires: Date.now() + REVIEW_TTL_SECONDS * 1000,
  })).toString('base64url')
  const signature = createHmac('sha256', reviewSecret()).update('review:' + payload).digest('base64url')
  return payload + '.' + signature
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminSession('bigcat')
    if (admin.scope !== 'bigcat') {
      return NextResponse.json({ success: false, error: 'BigCat admin access required.' }, { status: 403 })
    }

    if (request.headers.get('origin') !== request.nextUrl.origin) {
      return NextResponse.json({ success: false, error: 'Invalid origin.' }, { status: 403 })
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({ success: false, error: 'Admin rate limiting is not configured.' }, { status: 503 })
    }

    const clientIp = ipAddress(request) || 'unknown'
    const limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      prefix: 'bigcat:merchant-verification-review',
    })

    if (!(await limiter.limit(clientIp)).success) {
      return NextResponse.json({ success: false, error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const code = typeof body?.code === 'string' ? body.code : ''
    if (!code || code.length > 256) {
      return NextResponse.json({ success: false, error: 'Invalid access code.' }, { status: 400 })
    }

    const scope = scopeForAccessCode(code)
    if (scope !== 'bigcat') {
      return NextResponse.json({ success: false, error: 'Invalid BigCat Admin access code.' }, { status: 403 })
    }

    const adminSessionToken = (await cookies()).get('bigcat_admin_session')?.value || ''
    if (!adminSessionToken) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true, expiresIn: REVIEW_TTL_SECONDS })
    response.cookies.set(REVIEW_COOKIE, signReviewToken(adminSessionToken), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REVIEW_TTL_SECONDS,
    })
    return response
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Admin verification service is unavailable.' },
      { status: error?.message?.includes('required') ? 401 : 503 },
    )
  }
}
