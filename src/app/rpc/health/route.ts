import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { remoteLoggingEnabled } from '@/lib/logger'

/**
 * Health check — the single endpoint an uptime monitor should poll.
 *
 * Two levels of detail:
 *   - unauthenticated (a monitor has no session): status + DB reachability only.
 *     Nothing about versions, memory, configured integrations or error text —
 *     that used to leak the stack shape to anyone who asked.
 *   - `?verbose=1` with the CRON_SECRET (or a platform-admin session): the full
 *     diagnostic payload used during incidents.
 *
 *   curl -f https://your-domain/api/health || alert
 *   curl -H "x-cron-secret: $CRON_SECRET" https://your-domain/api/health?verbose=1
 */

export const dynamic = 'force-dynamic'

const startedAt = Date.now()

export async function GET(req: NextRequest) {
  const dbStart = Date.now()
  let dbOk = false
  let dbError: string | undefined

  try {
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown'
  }

  const dbLatency = Date.now() - dbStart
  const status = dbOk ? 200 : 503

  const wantsVerbose = req.nextUrl.searchParams.get('verbose') === '1'
  const secret = process.env.CRON_SECRET
  const authorized =
    wantsVerbose && Boolean(secret) && req.headers.get('x-cron-secret') === secret

  if (!authorized) {
    return NextResponse.json(
      { ok: dbOk, service: 'nexora', timestamp: new Date().toISOString() },
      { status, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const mem = process.memoryUsage()

  return NextResponse.json(
    {
      ok: dbOk,
      service: 'nexora',
      env: process.env.NODE_ENV || 'development',
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      checks: {
        database: { ok: dbOk, latencyMs: dbLatency, ...(dbError ? { error: dbError } : {}) },
      },
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
      observability: {
        sentry: Boolean(process.env.SENTRY_DSN),
        logtail: Boolean(process.env.LOGTAIL_TOKEN),
        remoteLogging: remoteLoggingEnabled,
        email: process.env.SMTP_HOST ? 'smtp' : 'mock',
        sms: process.env.SMS_PROVIDER || (process.env.KAVENEGAR_API_KEY ? 'kavenegar' : process.env.SMSIR_API_KEY ? 'smsir' : 'mock'),
      },
      timestamp: new Date().toISOString(),
    },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}
