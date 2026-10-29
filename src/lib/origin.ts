import { NextRequest } from 'next/server'

/**
 * Resolve the public origin for redirects and gateway callbacks.
 *
 * Behind the 4-worker cluster (or nginx, or any reverse proxy) the request
 * reaches Next.js on an internal port (3101–3104), so `req.nextUrl.origin`
 * points at the worker, not the public address. That broke gateway
 * callbacks — ZarinPal would redirect the user to :3104 instead of :3100.
 *
 * Resolution order:
 *   1. PUBLIC_BASE_URL  — explicit, authoritative (production)
 *   2. x-forwarded-host — set by our cluster proxy / nginx
 *   3. req.nextUrl.origin — direct hit, no proxy
 */
export function resolveOrigin(req: NextRequest): string {
  const explicit = process.env.PUBLIC_BASE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const forwardedHost = req.headers.get('x-forwarded-host')
  if (forwardedHost) {
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    return `${proto}://${forwardedHost}`
  }

  return req.nextUrl.origin
}
