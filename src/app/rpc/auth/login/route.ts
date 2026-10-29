import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { loginSchema, firstError } from '@/lib/validation'
import { rateLimit, peekRateLimit, resetRateLimit, clientIp } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

/**
 * Login — hardened:
 * - Zod shape validation
 * - Rate limit: 8 attempts / 10 min per IP+email (brute-force budget)
 * - Account lockout: 20 failures / 15 min per email, independent of IP
 * - Uniform error for "no user" / "wrong password" (no account enumeration)
 * - Google-only accounts get a hint instead of a misleading 401
 * - Security events land in the audit log
 *
 * The per-IP budget alone does not stop a distributed attempt: a botnet with
 * a thousand addresses gets 8 tries each against the same account. The
 * per-email counter is what actually caps that, and because it lives in the
 * shared table it holds across all four workers.
 */

const FAIL_LIMIT = 20
const FAIL_WINDOW_MS = 15 * 60 * 1000
const failKey = (email: string) => `login-fail:${email.toLowerCase()}`
export async function POST(req: NextRequest) {
  const ip = clientIp(req)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست معتبر نیست' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
  }
  const { email, password } = parsed.data

  // brute-force budget: per IP+email pair
  const rl = await rateLimit(`login:${ip}:${email}`, 8, 10 * 60 * 1000)
  if (!rl.ok) {
    await audit({ action: 'login.rate_limited', detail: `email=${email}`, req })
    return NextResponse.json(
      { error: `تلاش‌های زیاد؛ ${Math.ceil(rl.retryAfterSec / 60)} دقیقه دیگر تلاش کن` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  // Account-level lockout, checked before the password is touched. This is the
  // only control that survives an attacker rotating IPs.
  const lock = await peekRateLimit(failKey(email), FAIL_LIMIT)
  if (lock.blocked) {
    await audit({
      action: 'login.locked',
      detail: `email=${email} ip=${ip} locked for ${lock.retryAfterSec}s`,
      req,
    })
    return NextResponse.json(
      {
        error: `این حساب به‌دلیل تلاش‌های ناموفق موقتاً قفل شده است؛ ${Math.ceil(
          lock.retryAfterSec / 60
        )} دقیقه دیگر تلاش کن`,
      },
      { status: 423, headers: { 'Retry-After': String(lock.retryAfterSec) } }
    )
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email },
      include: { business: true },
    })

    if (!user) {
      await audit({ action: 'login.failed', detail: `email=${email} (no such user)`, req })
      return NextResponse.json({ error: 'ایمیل یا رمز عبور اشتباه است' }, { status: 401 })
    }

    if (!user.isActive || !user.business.isActive) {
      await audit({
        businessId: user.businessId,
        userId: user.id,
        action: 'login.blocked',
        detail: 'inactive account',
        req,
      })
      return NextResponse.json({ error: 'حساب کاربری غیرفعال است' }, { status: 403 })
    }

    // Google-only accounts have no local password — point them to Google sign-in.
    if (!user.password) {
      await audit({
        businessId: user.businessId,
        userId: user.id,
        action: 'login.google_only',
        detail: `email=${email}`,
        req,
      })
      return NextResponse.json(
        { error: 'این حساب با گوگل ثبت شده است؛ از دکمه «ورود با گوگل» استفاده کن' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      const budget = await rateLimit(failKey(email), FAIL_LIMIT, FAIL_WINDOW_MS)
      await audit({
        businessId: user.businessId,
        userId: user.id,
        action: 'login.failed',
        detail: `email=${email} (bad password) remaining=${budget.remaining}`,
        req,
      })
      return NextResponse.json({ error: 'ایمیل یا رمز عبور اشتباه است' }, { status: 401 })
    }

    // Correct password — the account is not under attack from its owner.
    await resetRateLimit(failKey(email))

    const authUser = {
      id: user.id,
      businessId: user.businessId,
      name: user.name,
      email: user.email,
      role: user.role,
      businessSlug: user.business.slug,
      businessPlan: user.business.plan,
    }
    const token = generateToken(authUser, user.tokenVersion)

    await audit({
      businessId: user.businessId,
      userId: user.id,
      action: 'login.success',
      detail: `email=${email}`,
      req,
    })

    const response = NextResponse.json({ user: authUser, token })
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 })
  }
}
