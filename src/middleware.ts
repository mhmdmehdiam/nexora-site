import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSameSiteOrigin } from '@/lib/csrf'

const PROTECTED = ['/admin', '/dashboard']

/* ---------------------------------------------------------------------------
 * Blanket API throttle.
 *
 * Per-route limits (login, register, sms, ai, billing, contact, export) guard
 * the expensive or abusable endpoints individually. This is the coarse net
 * underneath them: it stops a single client from hammering any endpoint at a
 * rate that would starve everyone else.
 *
 * Runs in the Edge runtime, so the store is per-isolate — with N workers the
 * effective ceiling is N x LIMIT. That is intentional: this is a flood guard,
 * not a billing quota. Swap for Upstash Redis when a hard global limit matters.
 * ------------------------------------------------------------------------- */
const WINDOW_MS = 60_000
const LIMIT = 300
const hits = new Map<string, { n: number; reset: number }>()

/** Largest API body we will even look at. Bulk import is the current maximum. */
const MAX_API_BODY = 2 * 1024 * 1024

/**
 * Trustworthy client address.
 *
 * `x-real-ip` is written by nginx from `$remote_addr`; `x-forwarded-for` is
 * append-only, so only its last hop is ours. See lib/rate-limit.ts for why the
 * first hop must never be used.
 */
function resolveIp(request: NextRequest): string {
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real

  // CDN edge before nginx (Cloudflare / Fastly / Azure Front Door).
  const edge =
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('true-client-ip')?.trim()
  if (edge) return edge

  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) {
    const parts = fwd
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }

  return 'local'
}

function apiThrottled(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k)
  }
  const rec = hits.get(ip)
  if (!rec || rec.reset < now) {
    hits.set(ip, { n: 1, reset: now + WINDOW_MS })
    return { ok: true, retryAfter: 0 }
  }
  if (rec.n >= LIMIT) return { ok: false, retryAfter: Math.ceil((rec.reset - now) / 1000) }
  rec.n++
  return { ok: true, retryAfter: 0 }
}

/**
 * Security middleware — two jobs:
 *
 * 1. CSRF hardening: browsers always attach an Origin header to cross-site
 *    requests. If a mutating request (POST/PUT/PATCH/DELETE) carries an
 *    Origin that doesn't match our host, reject it before it reaches any
 *    route. (Curl/scripts without Origin still pass — API auth is the real
 *    boundary; this kills browser-based cross-site attacks.)
 * 2. Security headers on every response.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    /* Body size ceiling.
     *
     * Nothing this API accepts is anywhere near a megabyte — the largest is a
     * bulk import. A declared Content-Length above the cap is rejected before
     * the body is read, so a hostile client cannot make a worker buffer
     * hundreds of megabytes per connection.
     */
    const declared = Number(request.headers.get('content-length') || 0)
    if (declared > MAX_API_BODY) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'حجم درخواست بیش از حد مجاز است' }, { status: 413 })
      )
    }

    // Same resolution order as lib/rate-limit: x-real-ip first, then the
    // RIGHTMOST x-forwarded-for hop. The leftmost entry is whatever the client
    // typed; trusting it made the flood guard trivially bypassable.
    const ip = resolveIp(request)

    // never throttle the health probe — that is what uptime monitors hit
    if (pathname !== '/api/health') {
      const gate = apiThrottled(ip)
      if (!gate.ok) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'درخواست‌های زیاد از این آدرس' },
            { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } }
          )
        )
      }
    }

    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
    if (mutating) {
      // Compares against x-forwarded-host, not Host — see lib/csrf.ts for why
      // using Host broke every POST in production while passing locally.
      const sameSite = isSameSiteOrigin(
        request.headers.get('origin'),
        request.headers.get('x-forwarded-host'),
        request.headers.get('host')
      )
      if (!sameSite) {
        return addSecurityHeaders(
          NextResponse.json({ error: 'درخواست بین‌سایتی مسدود شد' }, { status: 403 })
        )
      }
    }
    return addSecurityHeaders(NextResponse.next())
  }

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (!isProtected) return addSecurityHeaders(NextResponse.next())

  const token = request.cookies.get('token')?.value

  // No session cookie → send to login before the shell is even rendered.
  // The real authorisation boundary is still the API layer, which verifies
  // the JWT signature and the user's role on every request.
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return addSecurityHeaders(NextResponse.redirect(url))
  }

  return addSecurityHeaders(NextResponse.next())
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  // Clickjacking / MIME sniffing / referrer leakage / powerful browser APIs
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  res.headers.set('X-DNS-Prefetch-Control', 'off')

  // Force HTTPS once deployed behind TLS (no-op on http://localhost)
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Isolate the browsing context: no window.opener handoff to a popup we did
  // not open ourselves, no cross-origin subresource embedding of our responses.
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  res.headers.set('Origin-Agent-Cluster', '?1')

  // Where CSP violations are reported (see /api/csp-report).
  res.headers.set('Reporting-Endpoints', 'csp="/api/csp-report"')

  /* Content-Security-Policy.
   *
   * 'unsafe-inline' for scripts is required by the theme bootstrap in
   * layout.tsx (it must run before first paint) and by Next's own inline
   * bootstrap. Moving to a nonce would force every page — including the
   * static legal pages — into dynamic rendering, so the trade-off is
   * deliberate: we still block external script origins, framing, plugins and
   * form hijacking, which is where the real risk sits.
   *
   * 'unsafe-eval' is NOT part of that trade-off: nothing in the production
   * bundle needs eval. It is allowed in development only, because React
   * Refresh compiles modules at runtime. Shipping it to production would turn
   * any injection into arbitrary code execution.
   */
  const dev = process.env.NODE_ENV !== 'production'
  const scriptSrc = dev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'"

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
    "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
    'report-uri /api/csp-report',
    'report-to csp',
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)

  return res
}

export const config = {
  // everything except Next internals and static assets — security headers
  // belong on every page, CSRF + auth gates wherever they apply
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
