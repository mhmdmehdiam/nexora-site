import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { createResetToken } from '@/lib/password-reset'
import { sendEmail, emailLayout, emailButton } from '@/lib/email'
import { resolveOrigin } from '@/lib/origin'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست').max(200),
})

/**
 * Request a reset link.
 *
 * Always answers 200 with the same message — revealing "no such account"
 * would turn this endpoint into a user-enumeration oracle.
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  // 5 requests per hour per IP — this endpoint sends mail, so it is a spam vector
  const rl = await rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `درخواست‌های زیاد؛ ${Math.ceil(rl.retryAfterSec / 60)} دقیقه دیگر تلاش کن` },
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
    return NextResponse.json({ error: 'ایمیل معتبر نیست' }, { status: 400 })
  }

  const { email } = parsed.data
  const generic = {
    ok: true,
    message: 'اگر این ایمیل در سیستم ثبت شده باشد، لینک بازیابی برایت ارسال شد.',
  }

  const user = await prisma.user.findFirst({
    where: { email },
    include: { business: { select: { name: true, isActive: true } } },
  })

  // No account, inactive account, or a Google-only account (nothing to reset)
  if (!user || !user.isActive || !user.business.isActive || !user.password) {
    await audit({ action: 'password.reset_requested', detail: `email=${email} (no actionable account)`, req })
    return NextResponse.json(generic)
  }

  const { token } = await createResetToken(user.id, ip)
  const link = `${resolveOrigin(req)}/reset-password?token=${encodeURIComponent(token)}`

  const result = await sendEmail({
    to: email,
    subject: 'بازیابی رمز عبور — نکسورا',
    html: emailLayout({
      title: 'بازیابی رمز عبور',
      body: `
        <p style="margin:0 0 14px">سلام ${escapeHtml(user.name)}،</p>
        <p style="margin:0 0 6px">برای حساب <strong>${escapeHtml(user.business.name)}</strong> درخواست تغییر رمز عبور ثبت شد.</p>
        <p style="margin:0">برای تعیین رمز جدید روی دکمه زیر بزن. این لینک <strong>۶۰ دقیقه</strong> اعتبار دارد و فقط یک بار کار می‌کند.</p>
        ${emailButton(link, 'تعیین رمز عبور جدید')}
        <p style="margin:0;font-size:12.5px;color:#8a7c68">اگر این درخواست را تو نداده‌ای، این ایمیل را نادیده بگیر؛ رمز فعلی‌ات تغییر نمی‌کند.</p>
      `,
    }),
    text: `بازیابی رمز عبور نکسورا\n\n${link}\n\nاین لینک ۶۰ دقیقه اعتبار دارد.`,
  })

  await audit({
    businessId: user.businessId,
    userId: user.id,
    action: 'password.reset_requested',
    detail: `email=${email} sent=${result.ok} provider=${result.provider}`,
    req,
  })

  // A broken mail server must not turn into a 500 — the user still gets the
  // generic message, and the failure is visible in the audit log.
  if (!result.ok) {
    console.error('[forgot-password] send failed:', result.error)
  }

  return NextResponse.json(generic)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
