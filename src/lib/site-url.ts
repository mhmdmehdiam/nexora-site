/**
 * Canonical site URL.
 *
 * metadataBase, sitemap, robots, OG images and the payment callback all need
 * an absolute origin. If this silently falls back to localhost in production,
 * every shared link previews as "http://localhost:3100" and Google indexes
 * nothing useful — which is exactly what used to happen.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL   (preferred — safe to expose to the browser)
 *   2. PUBLIC_BASE_URL        (used by the payment gateway callback)
 *   3. http://localhost:3000  (development only)
 */

function normalize(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function resolveBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL
  if (raw) return normalize(raw)
  return 'http://localhost:3100'
}

/** True when no real origin is configured — used to warn loudly at boot. */
export function isBaseUrlConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL)
}
