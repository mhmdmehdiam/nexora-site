import { prisma } from './db'

/*
 * In-memory cache for settings — settings rarely change, so we avoid
 * hitting the database on every request. Cache TTL = 60s.
 * In a multi-instance deployment, settings changes propagate within
 * one TTL window (acceptable for config values like tax_rate).
 */

const cache = new Map<string, { value: string; ts: number }>()
const CACHE_TTL_MS = 60_000

function getCached(key: string): string | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key)
    return undefined
  }
  return entry.value
}

function setCached(key: string, value: string) {
  cache.set(key, { value, ts: Date.now() })
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany()
  const out: Record<string, string> = {}
  for (const r of rows) {
    out[r.key] = r.value
    setCached(r.key, r.value)
  }
  return out
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const cached = getCached(key)
  if (cached !== undefined) return cached

  const row = await prisma.setting.findUnique({ where: { key } })
  const value = row?.value ?? fallback
  setCached(key, value)
  return value
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
  setCached(key, value)
}

export async function setSettings(data: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    await setSetting(key, String(value))
  }
}
