import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthUser, verifyPassword, hashPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  currentPassword: z.string().min(1, 'رمز فعلی را وارد کن').max(200),
  newPassword: z
    .string()
    .min(8, 'رمز جدید باید حداقل ۸ کاراکتر باشد')
    .max(200)
    .regex(/[A-Za-z\u0600-\u06FF]/, 'رمز جدید باید حداقل یک حرف داشته باشد'),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`chpass:${user.id}`, 5, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'تلاش‌های زیاد؛ کمی بعد دوباره امتحان کن' }, { status: 429 })
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

  const { currentPassword, newPassword } = parsed.data

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  })

  if (!record?.password) {
    return NextResponse.json(
      { error: 'این حساب با گوگل ساخته شده و رمز عبوری ندارد' },
      { status: 400 }
    )
  }

  if (!(await verifyPassword(currentPassword, record.password))) {
    await audit({
      businessId: user.businessId,
      userId: user.id,
      action: 'password.change_failed',
      detail: 'wrong current password',
      req,
    })
    return NextResponse.json({ error: 'رمز فعلی درست نیست' }, { status: 400 })
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'رمز جدید باید با رمز فعلی متفاوت باشد' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      // every other session dies; the caller must sign in again
      tokenVersion: { increment: 1 },
    },
  })

  await audit({
    businessId: user.businessId,
    userId: user.id,
    action: 'password.changed',
    detail: 'changed from account settings',
    req,
  })

  const res = NextResponse.json({
    ok: true,
    message: 'رمز عبور تغییر کرد. برای ادامه دوباره وارد شو.',
  })
  res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
