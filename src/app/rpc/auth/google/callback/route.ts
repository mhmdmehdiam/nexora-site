import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/auth'
import { resolveOrigin } from '@/lib/origin'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

interface GoogleIdTokenPayload {
  sub: string
  aud?: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
}

function fail(req: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, resolveOrigin(req)))
}

/** Base64url-decode a JWT segment into a plain object. */
function decodeIdToken(idToken: string): GoogleIdTokenPayload | null {
  try {
    const [, payload] = idToken.split('.')
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Step 2 of Google OAuth: validate state, exchange the code for tokens,
 * link or create the account, then issue our own JWT cookie and hand off
 * to /auth/complete which stores the session client-side.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return fail(req, 'google_not_configured')

  const url = req.nextUrl
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = req.cookies.get('g_state')?.value

  if (url.searchParams.get('error')) return fail(req, 'google_denied')
  if (!code) return fail(req, 'google_failed')
  // CSRF: the state we receive must match the one we set before the redirect.
  if (!state || !cookieState || state !== cookieState) return fail(req, 'google_state')

  // Must be byte-identical to the value sent in step 1 — Google rejects the
  // exchange otherwise. Same helper, same answer (see the note in ../route.ts
  // about worker ports).
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${resolveOrigin(req)}/api/auth/google/callback`

  try {
    /* ---------- 1. exchange code for tokens ---------- */
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) return fail(req, 'google_failed')

    const tokens = (await tokenRes.json()) as { id_token?: string }
    if (!tokens.id_token) return fail(req, 'google_failed')

    const claims = decodeIdToken(tokens.id_token)
    // aud must be our client id; email must exist and be verified by Google.
    if (!claims || claims.aud !== clientId) return fail(req, 'google_failed')
    const { sub, email, email_verified, name, picture } = claims
    if (!sub || !email || !email_verified) return fail(req, 'google_email_unverified')

    /* ---------- 2. link or create the account ---------- */
    let user = await prisma.user.findFirst({
      where: { googleId: sub },
      include: { business: true },
    })

    if (!user) {
      // No Google link yet — match on email (prefer an owner account).
      const candidates = await prisma.user.findMany({
        where: { email },
        include: { business: true },
        orderBy: { createdAt: 'asc' },
      })
      user = candidates.find((c) => c.role === 'owner') || candidates[0] || null

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: sub, avatar: user.avatar || picture || null },
          include: { business: true },
        })
      }
    }

    if (!user) {
      // First login with this email — provision a fresh business (free plan),
      // mirroring the self-service registration flow.
      const displayName = name || email.split('@')[0]
      const slug =
        displayName.replace(/[^\w؀-ۿ\s]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 30) +
        '-' +
        Date.now().toString(36)

      const business = await prisma.business.create({
        data: { name: displayName, slug, email, plan: 'free' },
      })
      await prisma.subscription.create({
        data: { businessId: business.id, plan: 'free', amount: 0, status: 'active' },
      })
      user = await prisma.user.create({
        data: {
          businessId: business.id,
          name: displayName,
          email,
          password: null,
          googleId: sub,
          role: 'owner',
          avatar: picture || null,
        },
        include: { business: true },
      })
    }

    if (!user.isActive || !user.business.isActive) return fail(req, 'google_inactive')

    /* ---------- 3. issue our session ---------- */
    const token = generateToken({
      id: user.id,
      businessId: user.businessId,
      name: user.name,
      email: user.email,
      role: user.role,
      businessSlug: user.business.slug,
      businessPlan: user.business.plan,
    }, user.tokenVersion)

    // Same reason: never bounce the browser to the worker's own port.
    const response = NextResponse.redirect(new URL('/auth/complete', resolveOrigin(req)))
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    response.cookies.set('g_state', '', { maxAge: 0, path: '/' })
    return response
  } catch (error) {
    console.error('Google callback error:', error)
    return fail(req, 'google_failed')
  }
}
