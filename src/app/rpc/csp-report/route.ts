import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * CSP violation sink.
 *
 * Two report formats exist and browsers send whichever the policy asked for:
 *   - `application/csp-report`  → { "csp-report": { ... } }        (report-uri)
 *   - `application/reports+json` → [ { type, body: {...} } ]        (report-to)
 *
 * Nothing here is trusted. A report is an unauthenticated POST from any page
 * on the internet that feels like mentioning us, so the endpoint:
 *   - caps the body (the middleware already rejects >2 MB, this is the belt)
 *   - rate-limits per IP
 *   - truncates every field before it reaches the log
 *   - always answers 204, so a prober learns nothing about whether it worked
 */

const MAX_FIELD = 300

function trim(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.length > MAX_FIELD ? `${value.slice(0, MAX_FIELD)}…` : value
}

interface RawReport {
  'document-uri'?: string
  'violated-directive'?: string
  'effective-directive'?: string
  'blocked-uri'?: string
  'source-file'?: string
  'line-number'?: number
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req)

  const gate = await rateLimit(`csp-report:${ip}`, 60, 10 * 60 * 1000)
  if (!gate.ok) return new NextResponse(null, { status: 204 })

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const reports: RawReport[] = []

  if (Array.isArray(payload)) {
    // report-to format
    for (const item of payload.slice(0, 10)) {
      const body = (item as { body?: RawReport })?.body
      if (body && typeof body === 'object') reports.push(body)
    }
  } else if (payload && typeof payload === 'object') {
    // report-uri format
    const single = (payload as { 'csp-report'?: RawReport })['csp-report']
    if (single && typeof single === 'object') reports.push(single)
  }

  for (const r of reports) {
    log.warn('csp_violation', {
      directive: trim(r['effective-directive'] || r['violated-directive']),
      blocked: trim(r['blocked-uri']),
      document: trim(r['document-uri']),
      source: trim(r['source-file']),
      line: typeof r['line-number'] === 'number' ? r['line-number'] : undefined,
      ip,
    })
  }

  return new NextResponse(null, { status: 204 })
}
