import { prisma } from './db'
import { verifyPayment } from './zarinpal'
import { getPlan } from './plans'

/**
 * Shared plan-activation logic used by both the gateway callback and the
 * reconciliation job. Keeping it in one place guarantees the two paths can
 * never drift (e.g. one extending the expiry and the other resetting it).
 */

export interface ActivateResult {
  ok: boolean
  alreadyPaid?: boolean
  error?: string
}

/**
 * Verify a payment with the gateway and, on success, activate the plan
 * atomically. Idempotent: a payment that is already `paid` returns
 * `alreadyPaid` without touching the database again.
 */
export async function verifyAndActivate(paymentId: string): Promise<ActivateResult> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) return { ok: false, error: 'پرداخت یافت نشد' }
  if (payment.status === 'paid') return { ok: true, alreadyPaid: true }
  if (payment.status === 'canceled') return { ok: false, error: 'پرداخت لغو شده است' }
  if (!payment.authority) return { ok: false, error: 'شناسه تراکنش موجود نیست' }

  const def = getPlan(payment.plan)
  if (!def) return { ok: false, error: 'پلن نامعتبر' }

  const verification = await verifyPayment({
    amountToman: payment.amount,
    authority: payment.authority,
  })

  if (!verification.ok) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    })
    return { ok: false, error: verification.error || 'تأیید پرداخت ناموفق بود' }
  }

  const now = new Date()
  const business = await prisma.business.findUnique({
    where: { id: payment.businessId },
    select: { plan: true, planExpiresAt: true },
  })

  // extend from the current expiry when the same plan is still active
  const stillActive =
    business?.plan === payment.plan && business?.planExpiresAt && business.planExpiresAt > now
  const base = stillActive ? business!.planExpiresAt! : now
  const expires = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'paid',
        paidAt: now,
        refId: verification.refId,
        cardPan: verification.cardPan,
      },
    }),
    prisma.business.update({
      where: { id: payment.businessId },
      data: { plan: payment.plan, planExpiresAt: expires },
    }),
    prisma.subscription.updateMany({
      where: { businessId: payment.businessId, status: 'active' },
      data: { status: 'expired' },
    }),
    prisma.subscription.create({
      data: {
        businessId: payment.businessId,
        plan: payment.plan,
        amount: payment.amount,
        currency: 'IRR',
        status: 'active',
        startDate: now,
        endDate: expires,
      },
    }),
  ])

  return { ok: true }
}
