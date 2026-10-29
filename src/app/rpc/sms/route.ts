import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getPlanLimits } from '@/lib/auth'
import { smsSchema, firstError } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { sendSms, activeProvider } from '@/lib/sms'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

/**
 * Send SMS.
 *
 * The provider (Kavenegar / SMS.ir / mock) is chosen from env — see
 * src/lib/sms.ts. We always persist the message first, then attempt
 * delivery, so the history reflects every attempt (including failures).
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limits = getPlanLimits(user.businessPlan)
  if (!limits.sms) {
    return NextResponse.json(
      { error: 'ارسال پیامک در پلن فعلی فعال نیست — به پلن حرفه‌ای ارتقا دهید' },
      { status: 403 }
    )
  }

  const rl = await rateLimit(`sms:${user.businessId}`, 30, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `سقف ارسال پیامک پر شده؛ ${rl.retryAfterSec} ثانیه دیگر تلاش کن` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  try {
    const parsed = smsSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    }
    const { customerId, phone, message } = parsed.data

    // Tenant integrity: the customer must belong to this business.
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: user.businessId, isActive: true },
      select: { id: true },
    })
    if (!customer) {
      return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 })
    }

    const result = await sendSms({ phone, message })

    const sms = await prisma.smsMessage.create({
      data: {
        businessId: user.businessId,
        customerId,
        phone,
        message,
        status: result.ok ? 'sent' : 'failed',
        sentAt: result.ok ? new Date() : null,
      },
    })

    if (!result.ok) {
      return NextResponse.json(
        { sms, error: result.error || 'ارسال پیامک ناموفق بود', provider: result.provider },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        sms,
        provider: result.provider,
        messageId: result.messageId,
        note: result.mock ? 'حالت آزمایشی — پیامک واقعی ارسال نشد' : undefined,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Send SMS error:', error)
    return NextResponse.json({ error: 'خطا در ارسال پیامک' }, { status: 500 })
  }
}

/** SMS history + which provider is currently active. */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const messages = await prisma.smsMessage.findMany({
    where: { businessId: user.businessId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { customer: { select: { name: true } } },
  })

  return NextResponse.json({
    messages,
    provider: activeProvider(),
    planAllowsSms: getPlanLimits(user.businessPlan).sms,
  })
}
