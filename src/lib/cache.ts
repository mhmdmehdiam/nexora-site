/**
 * Tiny in-process TTL cache for expensive read endpoints.
 *
 * Reports and dashboard aggregates run 5–8 queries each; caching them for
 * 30–60s removes almost all of that load from PostgreSQL under a heavy
 * read pattern (500 concurrent users all opening the dashboard).
 *
 * The cache is per-process. With multiple Next.js instances each keeps its
 * own copy — acceptable for dashboard data where 30–60s of staleness is
 * invisible to the user. Mutations don't need to invalidate it: the TTL is
 * short enough that the next natural refresh picks up the change.
 *
 * If you later add Redis/Upstash, swap the Map for the client — the
 * `cached()` signature stays the same.
 */

interface Entry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, Entry<unknown>>()
let lastSweep = Date.now()
const SWEEP_MS = 5 * 60 * 1000
const MAX_ENTRIES = 2000

function sweep(now: number) {
  if (now - lastSweep < SWEEP_MS) return
  lastSweep = now
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key)
  }
  // hard cap so a pathological key space can't grow forever
  if (store.size > MAX_ENTRIES) {
    const excess = store.size - MAX_ENTRIES
    let removed = 0
    for (const key of store.keys()) {
      store.delete(key)
      if (++removed >= excess) break
    }
  }
}

/**
 * Return the cached value for `key`, or run `fn` and cache its result.
 * Errors are never cached.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  sweep(now)

  const hit = store.get(key) as Entry<T> | undefined
  if (hit && hit.expiresAt > now) return hit.value

  const value = await fn()
  store.set(key, { value, expiresAt: now + ttlMs })
  return value
}

/** Drop every entry whose key starts with `prefix` (call after a write). */
export function invalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
