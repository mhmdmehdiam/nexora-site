import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { getPlan, isPaidPlan } from '@/lib/plans'
import { requestPayment, gatewayMode } from '@/lib/zarinpal'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { resolveOrigin } from '@/lib/origin'

/**
 * Billing checkout — creates a pending Payment and returns the gateway URL.
 * Amount is written from OUR plan table, never from the client.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`checkout:${user.businessId}`, 10, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کن` },
      { status: 429 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست معتبر نیست' }, { status: 400 })
  }

  const plan = body?.plan
  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: 'پلن انتخابی معتبر نیست' }, { status: 400 })
  }

  const def = getPlan(plan)!
  const origin = resolveOrigin(req)

  const payment = await prisma.payment.create({
    data: {
      businessId: user.businessId,
      userId: user.id,
      plan,
      amount: def.price,
      status: 'pending',
      gateway: gatewayMode(),
    },
  })

  const result = await requestPayment({
    amountToman: def.price,
    description: `ارتقا به پلن ${def.name} — نکسورا`,
    callbackUrl: `${origin}/api/billing/callback`,
    email: user.email,
  })

  if (!result.ok || !result.authority) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    })
    await audit({
      businessId: user.businessId,
      userId: user.id,
      action: 'billing.request_failed',
      entity: 'payment',
      entityId: payment.id,
      detail: result.error,
      req,
    })
    return NextResponse.json({ error: result.error || 'خطا در ایجاد تراکنش' }, { status: 502 })
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { authority: result.authority },
  })

  await audit({
    businessId: user.businessId,
    userId: user.id,
    action: 'billing.checkout',
    entity: 'payment',
    entityId: payment.id,
    detail: `plan=${plan} amount=${def.price}`,
    req,
  })

  // mock gateway → internal simulate page; real gateway → ZarinPal StartPay
  const redirectUrl =
    result.redirectUrl ||
    `${origin}/billing/simulate?payment=${payment.id}&authority=${result.authority}`

  return NextResponse.json({ redirectUrl, paymentId: payment.id }, { status: 201 })
}
