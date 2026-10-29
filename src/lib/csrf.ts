/**
 * CSRF origin check.
 *
 * Extracted from the middleware so it can be tested directly. The HTTP-level
 * test could not cover the production topology: the cluster proxy rewrites
 * `Host` to `localhost:3100` for internal routing, so a request that looks
 * correct from outside arrives at the worker with a different host than the
 * browser's Origin. Comparing the two rejected every legitimate POST in
 * production — login, registration, every form — with a 403, and passed
 * locally only because there the values happen to match.
 *
 * The fix is to compare against the host the *browser* used:
 *   `x-forwarded-host` (nginx `$host`, then the cluster proxy's incoming Host)
 *   falling back to `Host` when nothing sits in front.
 *
 * A client cannot forge `x-forwarded-host`: nginx overwrites whatever was sent.
 */

export function publicHost(
  forwardedHost: string | null,
  host: string | null
): string {
  const first = forwardedHost?.split(',')[0]?.trim()
  return first || host || ''
}

/**
 * @returns true when the request is same-site (or has no Origin at all, which
 *          means it did not come from a browser cross-site request).
 */
export function isSameSiteOrigin(
  origin: string | null,
  forwardedHost: string | null,
  host: string | null
): boolean {
  if (!origin) return true

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }

  return originHost === publicHost(forwardedHost, host)
}
