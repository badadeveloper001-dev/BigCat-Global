import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

// In-memory rate limit store per edge instance.
// Each serverless invocation gets its own process, so this caps
// burst abuse within a single invocation window, not globally.
// For global rate limiting, pair with Upstash Redis in production.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// Route-specific limits: [maxRequests, windowMs]
const LIMITS: Record<string, [number, number]> = {
  '/api/auth':     [10, 60_000],   // 10 auth attempts / min per IP
  '/api/checkout': [20, 60_000],   // 20 checkout calls / min per IP
  '/api/ai':       [15, 60_000],   // 15 AI search calls / min per IP
}

const DEFAULT_LIMIT: [number, number] = [120, 60_000] // 120 req / min per IP

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function isRateLimited(ip: string, path: string): { limited: boolean; remaining: number; resetAt: number } {
  const [max, windowMs] = Object.entries(LIMITS).find(([prefix]) => path.startsWith(prefix))?.[1] ?? DEFAULT_LIMIT
  const key = `${ip}:${path.split('/').slice(0, 3).join('/')}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { limited: false, remaining: max - 1, resetAt: now + windowMs }
  }

  entry.count++
  const remaining = Math.max(0, max - entry.count)
  return { limited: entry.count > max, remaining, resetAt: entry.resetAt }
}

function copySupabaseCookies(source: NextResponse, target: NextResponse) {
  target.cookies.setAll(source.cookies.getAll())

  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = source.headers.get(header)
    if (value) {
      target.headers.set(header, value)
    }
  }

  return target
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // Refresh/validate the SSR auth session using the API supported by the
  // installed @supabase/ssr version.
  await supabase.auth.getClaims()

  supabaseResponse.headers.set('Cache-Control', 'private, no-store')

  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl

  // Hostname-based portal routing for account-owned subdomains.
  // Only rewrite root requests to the portal; let other paths through (e.g., /admin/*, /api/*)
  const isAdminHost = hostname.startsWith('admin.') || hostname === 'bigcat-admin-portal.vercel.app'
  const isAgentHost = hostname.startsWith('agent.') || hostname === 'bigcat-agent-portal.vercel.app'

  if ((isAdminHost || isAgentHost) && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = isAdminHost ? '/admin-portal' : '/marketplace'

    const response = NextResponse.rewrite(url)
    return copySupabaseCookies(supabaseResponse, response)
  }

  // --- Rate limiting (API routes only) ---
  if (pathname.startsWith('/api/')) {
    const ip = getIp(request)
    const { limited, remaining, resetAt } = isRateLimited(ip, pathname)

    if (limited) {
      const response = new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
      return copySupabaseCookies(supabaseResponse, response)
    }

    const response = NextResponse.next({ request })
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    return copySupabaseCookies(supabaseResponse, response)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf)).*)",
  ],
}
