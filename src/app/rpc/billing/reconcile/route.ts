import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, isPlatformAdmin } from '@/lib/auth'
import { verifyAndActivate } from '@/lib/billing'
import { gatewayMode } from '@/lib/zarinpal'
import { audit } from '@/lib/audit'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

/**
 * Payment reconciliation.
 *
 * A user who pays but closes the browser before the gateway redirect never
 * hits /api/billing/callback — their Payment stays `pending` and the plan is
 * never activated even though the money left their account. This endpoint
 * sweeps those stale rows, re-verifies them with the gateway, and activates
 * the plan on success.
 *
 * Call it from a cron job every 10–15 minutes:
 *   curl -X POST https://your-domain/api/billing/reconcile \
 *        -H "x-cron-secret: $CRON_SECRET"
 *
 * Access:
 *   - `x-cron-secret` matching CRON_SECRET env → sweeps every tenant
 *   - platform admin session → sweeps every tenant
 *   - regular session → sweeps only their own business
 *
 * Safe to call repeatedly: `verifyAndActivate` is idempotent and payments
 * already marked paid/canceled are skipped.
 */

const STALE_AFTER_MS = 5 * 60 * 1000 // don't race the live callback
const MAX_BATCH = 100

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')
  const isCron = Boolean(cronSecret && headerSecret && headerSecret === cronSecret)

  let businessId: string | null = null
  let actor: { id: string; businessId: string } | null = null

  if (!isCron) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    actor = { id: user.id, businessId: user.businessId }
    if (!isPlatformAdmin(user)) businessId = user.businessId
  }

  if (gatewayMode() === 'mock') {
    return NextResponse.json({
      ok: true,
      gateway: 'mock',
      checked: 0,
      activated: 0,
      note: 'mock gateway — no external payments to reconcile',
    })
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_MS)

  const stale = await prisma.payment.findMany({
    where: {
      status: 'pending',
      authority: { not: null },
      createdAt: { lt: cutoff },
      ...(businessId ? { businessId } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_BATCH,
    select: { id: true, businessId: true, authority: true },
  })

  let activated = 0
  let failed = 0
  let stillPending = 0

  for (const payment of stale) {
    try {
      const result = await verifyAndActivate(payment.id)
      if (result.ok) {
        activated++
        await audit({
          businessId: payment.businessId,
          userId: actor?.id ?? null,
          action: 'billing.reconciled',
          entity: 'payment',
          entityId: payment.id,
          detail: 'activated by reconciliation sweep',
          req,
        })
      } else {
        failed++
      }
    } catch (err) {
      stillPending++
      console.error('[reconcile] failed for', payment.id, err)
    }
  }

  return NextResponse.json({
    ok: true,
    gateway: 'zarinpal',
    scope: businessId ? 'tenant' : 'all',
    checked: stale.length,
    activated,
    failed,
    stillPending,
  })
}

/** Cron services that only support GET can use this alias. */
export async function GET(req: NextRequest) {
  return POST(req)
}
