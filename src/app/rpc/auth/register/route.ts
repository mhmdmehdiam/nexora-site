import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { registerSchema, firstError } from '@/lib/validation'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

/**
 * Registration — hardened:
 * - Zod validation incl. password policy (≥8 chars, letter + digit)
 * - Rate limit: 5 signups / hour per IP (spam + enumeration budget)
 * - Atomic: business + owner + free subscription in one transaction
 * - Audit trail
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req)

  const rl = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
  if (!rl.ok) {
    await audit({ action: 'register.rate_limited', req })
    return NextResponse.json(
      { error: `تعداد ثبت‌نام از این آدرس زیاد است؛ بعداً تلاش کن` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست معتبر نیست' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
  }
  const { businessName, ownerName, email, password, phone, industry } = parsed.data

  try {
    // Email uniqueness — kept explicit (409) because the signup form needs a
    // clear recovery path; abuse is bounded by the rate limit above.
    const existing = await prisma.user.findFirst({ where: { email } })
    if (existing) {
      await audit({ action: 'register.duplicate', detail: `email=${email}`, req })
      return NextResponse.json({ error: 'این ایمیل قبلاً ثبت شده' }, { status: 409 })
    }

    // Generate slug from business name
    const slug =
      businessName
        .replace(/[^\w؀-ۿ\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 30) + '-' + Date.now().toString(36)

    const hashedPassword = await hashPassword(password)

    // Atomic provisioning: nothing is left half-created on failure.
    const { business, user } = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: businessName,
          slug,
          email,
          phone: phone || null,
          industry: industry || null,
          plan: 'free',
        },
      })

      const user = await tx.user.create({
        data: {
          businessId: business.id,
          name: ownerName,
          email,
          password: hashedPassword,
          role: 'owner',
          phone: phone || null,
        },
      })

      await tx.subscription.create({
        data: {
          businessId: business.id,
          plan: 'free',
          amount: 0,
          status: 'active',
        },
      })

      return { business, user }
    })

    await audit({
      businessId: business.id,
      userId: user.id,
      action: 'register.success',
      detail: `email=${email}`,
      req,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'حساب شما با موفقیت ایجاد شد',
        business: { id: business.id, name: business.name, slug: business.slug },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'خطا در ثبت‌نام' }, { status: 500 })
  }
}
