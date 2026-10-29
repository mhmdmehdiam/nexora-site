import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { verifyAndActivate } from '@/lib/billing'
import { audit } from '@/lib/audit'
import { resolveOrigin } from '@/lib/origin'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

/**
 * Gateway return (GET redirect from ZarinPal / simulate page).
 *
 * Security properties:
 * - the verified amount comes from OUR Payment row, never the query string
 * - idempotent: an already-paid payment just redirects to the dashboard
 * - plan activation lives in `verifyAndActivate` so the reconciliation
 *   job and this route can never diverge
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const origin = resolveOrigin(req)
  const dash = (q: string) => NextResponse.redirect(`${origin}/dashboard${q}`)

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=billing_auth`)
  }

  const authority =
    req.nextUrl.searchParams.get('Authority') || req.nextUrl.searchParams.get('authority')
  const status = (
    req.nextUrl.searchParams.get('Status') ||
    req.nextUrl.searchParams.get('status') ||
    ''
  ).toUpperCase()

  if (!authority) return dash('?billing=invalid')

  const payment = await prisma.payment.findUnique({ where: { authority } })

  // authority not ours, or belongs to another tenant → neutral redirect
  if (!payment || payment.businessId !== user.businessId) {
    await audit({
      businessId: user.businessId,
      userId: user.id,
      action: 'billing.callback_foreign',
      detail: `authority=${authority}`,
      req,
    })
    return dash('?billing=invalid')
  }

  // idempotent re-visit
  if (payment.status === 'paid') return dash('?billing=already')

  if (status !== 'OK') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'canceled' },
    })
    await audit({
      businessId: user.businessId,
      userId: user.id,
      action: 'billing.canceled',
      entity: 'payment',
      entityId: payment.id,
      req,
    })
    return dash('?billing=canceled')
  }

  const result = await verifyAndActivate(payment.id)

  if (!result.ok) {
    await audit({
      businessId: user.businessId,
      userId: user.id,
      action: 'billing.verify_failed',
      entity: 'payment',
      entityId: payment.id,
      detail: result.error,
      req,
    })
    return dash('?billing=failed')
  }

  await audit({
    businessId: user.businessId,
    userId: user.id,
    action: 'billing.paid',
    entity: 'payment',
    entityId: payment.id,
    detail: `plan=${payment.plan} amount=${payment.amount}`,
    req,
  })

  return dash('?billing=paid')
}
