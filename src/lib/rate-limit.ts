import { prisma } from './db'

/**
 * Rate limiting.
 *
 * Two stores, one contract:
 *
 *   - Postgres (default) — the window is global and survives restarts. This is
 *     the only version that actually protects anything behind the 4-worker
 *     cluster: with a per-process Map the real ceiling was 4× the configured
 *     limit and a restart cleared every counter, so an attacker only had to
 *     spread attempts across workers or wait for a deploy.
 *
 *   - In-memory (fallback) — used when the database is unreachable. A DB blip
 *     must not lock every user out of the product, so the limiter degrades to
 *     per-process instead of failing closed. Coarser, but better than a 500.
 *
 * The increment is a single atomic upsert: two concurrent requests cannot both
 * observe "under limit" and both proceed.
 */

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

/* -------------------------------------------------------------------------- */
/* in-memory fallback                                                         */
/* -------------------------------------------------------------------------- */

const memStore = new Map<string, { times: number[] }>()
let lastSweep = Date.now()
const SWEEP_INTERVAL = 10 * 60 * 1000

function memSweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL) return
  lastSweep = now
  for (const [key, hit] of memStore) {
    if (hit.times.length === 0 || now - hit.times[hit.times.length - 1] > 60 * 60 * 1000) {
      memStore.delete(key)
    }
  }
}

function memRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  memSweep(now)

  const hit = memStore.get(key) || { times: [] }
  hit.times = hit.times.filter((t) => now - t < windowMs)

  if (hit.times.length >= limit) {
    memStore.set(key, hit)
    const oldest = hit.times[0]
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((windowMs - (now - oldest)) / 1000),
    }
  }

  hit.times.push(now)
  memStore.set(key, hit)
  return { ok: true, remaining: limit - hit.times.length, retryAfterSec: 0 }
}

/* -------------------------------------------------------------------------- */
/* postgres                                                                   */
/* -------------------------------------------------------------------------- */

/** Probabilistic housekeeping: expired rows are deleted by ~1 request in 250. */
let cleanupTick = 0

async function dbRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + windowMs)

  const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, ${now}, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."expiresAt" <= ${now} THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimit"."expiresAt" <= ${now} THEN ${now}
        ELSE "RateLimit"."windowStart"
      END,
      "expiresAt" = CASE
        WHEN "RateLimit"."expiresAt" <= ${now} THEN ${resetAt}
        ELSE "RateLimit"."expiresAt"
      END
    RETURNING "count", "expiresAt"
  `

  if (++cleanupTick % 250 === 0) {
    prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "expiresAt" < ${now}`.catch(() => {})
  }

  const row = rows[0]
  if (!row) return { ok: true, remaining: limit - 1, retryAfterSec: 0 }

  if (row.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000))
    return { ok: false, remaining: 0, retryAfterSec }
  }

  return { ok: true, remaining: Math.max(0, limit - row.count), retryAfterSec: 0 }
}

/* -------------------------------------------------------------------------- */

/**
 * Record a hit and decide whether it is allowed.
 *
 * @param key      unique bucket, e.g. `login:1.2.3.4:user@mail.com`
 * @param limit    max hits inside the window
 * @param windowMs window length in ms
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    return await dbRateLimit(key, limit, windowMs)
  } catch {
    // Database unavailable — degrade to per-process rather than locking
    // everyone out of the product.
    return memRateLimit(key, limit, windowMs)
  }
}

/**
 * Read a bucket without recording a hit.
 *
 * Used for account lockout, where the check happens before the password is
 * verified and a wrong guess must not itself extend the lockout window.
 */
export async function peekRateLimit(
  key: string,
  limit: number
): Promise<{ blocked: boolean; retryAfterSec: number; remaining: number }> {
  try {
    const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
      SELECT "count", "expiresAt" FROM "RateLimit" WHERE "key" = ${key}
    `
    const row = rows[0]
    if (!row) return { blocked: false, retryAfterSec: 0, remaining: limit }

    const now = Date.now()
    const left = row.expiresAt.getTime() - now
    if (left <= 0) return { blocked: false, retryAfterSec: 0, remaining: limit }
    if (row.count >= limit) {
      return { blocked: true, retryAfterSec: Math.ceil(left / 1000), remaining: 0 }
    }
    return { blocked: false, retryAfterSec: 0, remaining: limit - row.count }
  } catch {
    return { blocked: false, retryAfterSec: 0, remaining: limit }
  }
}

/** Clear a bucket — called on a successful login so the budget starts clean. */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "key" = ${key}`
  } catch {
    // A failure here only means the counter survives to the next window.
  }
}

/**
 * Client IP behind a proxy.
 *
 * Order matters, and getting it wrong silently disables every IP-based limit.
 *
 *  1. `x-real-ip` — nginx sets this to `$remote_addr`. The client cannot
 *     influence it, so it is the only value worth trusting first.
 *
 *  2. `x-forwarded-for` — take the **rightmost** entry, not the first. nginx
 *     uses `$proxy_add_x_forwarded_for`, which appends the real peer to
 *     whatever the client already sent. So a request arriving as
 *     "1.2.3.4, 5.6.7.8" means 5.6.7.8 is real and 1.2.3.4 is a header the
 *     attacker typed. Reading [0] — as this used to — let anyone rotate a
 *     fake IP on every request and walk straight through login, register,
 *     forgot-password and contact limits.
 *
 *  3. `local` — direct hit with no proxy in front (dev, or the worker cluster).
 */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real

  // Cloudflare and similar CDNs terminate the connection before nginx and put
  // the true peer here. They also strip any value the client sent.
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf

  const trueClient = req.headers.get('true-client-ip')?.trim()
  if (trueClient) return trueClient

  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const parts = fwd
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }

  warnOnceNoProxy()
  return 'local'
}

/**
 * The failure mode when no proxy header exists is quiet and total: every
 * request collapses onto the key `local`, so one person registering uses the
 * shared five-per-hour budget and everyone after them is refused. Nobody would
 * connect that symptom to a missing header, so say it once, loudly.
 */
let warnedNoProxy = false

function warnOnceNoProxy() {
  if (warnedNoProxy) return
  if (process.env.NODE_ENV !== 'production') return
  warnedNoProxy = true
  console.warn(
    '[security] No client IP header on an API request in production. Rate limiting is ' +
      'keyed on "local", which means all visitors share a single bucket. Put nginx (or a ' +
      'CDN) in front and make sure it sends X-Real-IP / X-Forwarded-For.'
  )
}
