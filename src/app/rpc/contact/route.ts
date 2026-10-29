import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { sendEmail, emailLayout } from '@/lib/email'

export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().trim().min(2, 'نام را وارد کن').max(80),
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست').max(200),
  subject: z.string().trim().min(3, 'موضوع را وارد کن').max(120),
  message: z.string().trim().min(10, 'متن پیام حداقل ۱۰ کاراکتر باشد').max(4000),
  // honeypot — bots fill every field they see. Accept any value here; the
  // route answers 200 and drops the message, so the bot cannot tell it failed.
  website: z.string().max(500).optional().or(z.literal('')),
})

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  // 3 messages per hour per IP — a contact form is a spam target
  const rl = await rateLimit(`contact:${ip}`, 3, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `پیام‌های زیاد از این آدرس؛ ${Math.ceil(rl.retryAfterSec / 60)} دقیقه دیگر تلاش کن` },
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

  const { name, email, subject, message, website } = parsed.data

  // Silently accept honeypot hits so the bot does not learn it was caught
  if (website) return NextResponse.json({ ok: true })

  const inbox = process.env.CONTACT_INBOX || process.env.SMTP_USER || 'support@nexora.ir'

  const result = await sendEmail({
    to: inbox,
    replyTo: email,
    subject: `[تماس] ${subject}`,
    html: emailLayout({
      title: 'پیام جدید از فرم تماس',
      body: `
        <p style="margin:0 0 12px"><strong>از:</strong> ${escapeHtml(name)}</p>
        <p style="margin:0 0 12px"><strong>ایمیل:</strong> <span dir="ltr">${escapeHtml(email)}</span></p>
        <p style="margin:0 0 12px"><strong>موضوع:</strong> ${escapeHtml(subject)}</p>
        <hr style="border:0;border-top:1px solid #e6dcc8;margin:18px 0">
        <p style="margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>
      `,
      footer: 'برای پاسخ، فقط روی Reply بزن — آدرس ایمیل فرستنده تنظیم شده است.',
    }),
    text: `از: ${name} <${email}>\nموضوع: ${subject}\n\n${message}`,
  })

  await audit({
    action: 'contact.message',
    detail: `from=${email} subject=${subject} sent=${result.ok} provider=${result.provider}`,
    req,
  })

  if (!result.ok) {
    console.error('[contact] send failed:', result.error)
    return NextResponse.json(
      { error: 'ارسال پیام ناموفق بود. لطفاً مستقیم به support@nexora.ir ایمیل بزن.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, message: 'پیامت رسید. حداکثر یک روز کاری پاسخ می‌دهیم.' })
}
