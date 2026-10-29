import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { resolveOrigin } from '@/lib/origin'

/**
 * Step 1 of Google OAuth 2.0 (Authorization Code flow).
 * Redirects the user to Google's consent screen with a CSRF `state`.
 *
 * Env: GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (+ optional GOOGLE_REDIRECT_URI
 * when running behind a proxy that rewrites the origin).
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/login?error=google_not_configured', resolveOrigin(req))
    )
  }

  // resolveOrigin, NOT req.nextUrl.origin: behind the cluster the request
  // arrives on an internal worker port (3101–3104), so the raw origin would
  // hand Google "http://localhost:3102/..." — an address that is neither
  // registered in the console nor reachable from the user's browser.
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${resolveOrigin(req)}/api/auth/google/callback`

  // CSRF guard: a random value we set in a cookie and must see back verbatim.
  const state = crypto.randomBytes(24).toString('hex')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Always show the account chooser so a user with several Google accounts
    // is never silently signed in with the wrong one.
    prompt: 'select_account',
  })

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
  response.cookies.set('g_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes — the consent screen should not take longer
    path: '/',
  })
  return response
}
