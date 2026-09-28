import { NextResponse } from 'next/server'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/marketplace'
  }

  return value
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = safeNextPath(requestUrl.searchParams.get('next'))
  const role = requestUrl.searchParams.get('role') === 'merchant' ? 'merchant' : 'buyer'

  if (!code) {
    const error = requestUrl.searchParams.get('error_description')
      || requestUrl.searchParams.get('error')
      || 'Google did not return an authorization code.'

    return NextResponse.redirect(
      new URL(
        `/marketplace?oauth_error=${encodeURIComponent(error)}`,
        requestUrl.origin,
      ),
    )
  }

  const callbackUrl = new URL('/auth/callback', requestUrl.origin)
  callbackUrl.searchParams.set('code', code)
  callbackUrl.searchParams.set('next', next)
  callbackUrl.searchParams.set('role', role)

  return NextResponse.redirect(callbackUrl)
}
