import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { consumeResetToken } from '@/lib/password-reset'

export const dynamic = 'force-dynamic'

const schema = z.object({
  token: z.string().min(20, 'لینک بازیابی معتبر نیست').max(200),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
    .max(200, 'رمز عبور بیش از حد طولانی است')
    .regex(/[A-Za-z\u0600-\u06FF]/, 'رمز عبور باید حداقل یک حرف داشته باشد'),
})

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const rl = await rateLimit(`reset:${ip}`, 10, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'تلاش‌های زیاد؛ کمی بعد دوباره امتحان کن' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست معتبر نیست' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'ورودی نامعتبر' }, { status: 400 })
  }

  const { token, password } = parsed.data
  const consumed = await consumeResetToken(token)

  if (!consumed.ok) {
    const message =
      consumed.reason === 'expired'
        ? 'این لینک منقضی شده است؛ لینک جدید درخواست کن'
        : consumed.reason === 'used'
          ? 'این لینک قبلاً استفاده شده است'
          : 'لینک بازیابی معتبر نیست'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: consumed.userId },
    select: { id: true, businessId: true, isActive: true, business: { select: { isActive: true } } },
  })

  if (!user || !user.isActive || !user.business.isActive) {
    return NextResponse.json({ error: 'حساب کاربری فعال نیست' }, { status: 403 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(password),
      // every existing session dies with the old password
      tokenVersion: { increment: 1 },
      emailVerifiedAt: new Date(),
    },
  })

  await audit({
    businessId: user.businessId,
    userId: user.id,
    action: 'password.reset_completed',
    detail: 'password changed via reset link',
    req,
  })

  return NextResponse.json({ ok: true, message: 'رمز عبور تغییر کرد. حالا می‌توانی وارد شوی.' })
}
