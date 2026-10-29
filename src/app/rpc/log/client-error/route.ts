import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { z } from 'zod'

/**
 * Client error sink.
 *
 * The browser error boundary posts here so client-side crashes land in the
 * same log stream as server errors (and reach Sentry when configured).
 *
 * Unauthenticated by design — a crash on the login page must still be
 * reportable — but rate-limited per IP so it can't be used as a log-spam
 * amplifier.
 */

const schema = z.object({
  message: z.string().max(500),
  digest: z.string().max(100).optional(),
  stack: z.string().max(4000).optional(),
  url: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await rateLimit(`client-error:${ip}`, 20, 10 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  log.error('client_error', undefined, {
    source: 'browser',
    ip,
    message: parsed.data.message,
    digest: parsed.data.digest,
    url: parsed.data.url,
    stack: parsed.data.stack,
    ua: req.headers.get('user-agent')?.slice(0, 200),
  })

  return NextResponse.json({ ok: true })
}
