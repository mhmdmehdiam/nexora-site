import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, hashPassword, getPlanLimits } from '@/lib/auth'
import { z } from 'zod'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

/**
 * Tenant-scoped user management.
 *
 * Owners/admins manage the users of THEIR OWN business — the platform
 * admin endpoint (/api/admin/users) is a different surface that lists
 * every tenant. Everything here is filtered by `user.businessId`, so a
 * crafted request can never read or write another tenant's team.
 */

const createSchema = z.object({
  name: z.string().trim().min(2, 'نام باید حداقل ۲ حرف باشد').max(80),
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست'),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
    .regex(/[A-Za-z]/, 'رمز عبور باید حداقل یک حرف داشته باشد')
    .regex(/[0-9]/, 'رمز عبور باید حداقل یک رقم داشته باشد'),
  role: z.enum(['admin', 'manager', 'user']).default('user'),
  phone: z.string().trim().max(20).optional().nullable(),
})

const MAX_LIMIT = 100

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // only owner/admin may see the team
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 403 })
  }

  const search = req.nextUrl.searchParams.get('search') || ''
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '50', 10) || 50))
  const skip = (page - 1) * limit

  const where: any = { businessId: user.businessId }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  const limits = getPlanLimits(user.businessPlan)

  return NextResponse.json({
    users,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    limits: {
      plan: user.businessPlan,
      maxUsers: limits.maxUsers, // -1 = unlimited
      used: total,
      remaining: limits.maxUsers === -1 ? -1 : Math.max(0, limits.maxUsers - total),
    },
    me: { id: user.id, role: user.role },
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست معتبر نیست' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'ورودی نامعتبر' }, { status: 400 })
  }
  const data = parsed.data

  // admins cannot mint owners or other admins — only the owner can
  if (user.role === 'admin' && data.role === 'admin') {
    return NextResponse.json({ error: 'فقط مالک می‌تواند مدیر بسازد' }, { status: 403 })
  }

  try {
    // plan limit
    const limits = getPlanLimits(user.businessPlan)
    if (limits.maxUsers !== -1) {
      const count = await prisma.user.count({ where: { businessId: user.businessId } })
      if (count >= limits.maxUsers) {
        return NextResponse.json(
          {
            error: `سقف کاربران پلن «${user.businessPlan}» (${limits.maxUsers} نفر) پر شده است. برای افزودن بیشتر، پلن را ارتقا دهید.`,
          },
          { status: 402 }
        )
      }
    }

    // email uniqueness inside the tenant
    const exists = await prisma.user.findFirst({
      where: { businessId: user.businessId, email: data.email },
      select: { id: true },
    })
    if (exists) {
      return NextResponse.json({ error: 'این ایمیل قبلاً در تیم شما ثبت شده' }, { status: 409 })
    }

    const created = await prisma.user.create({
      data: {
        businessId: user.businessId,
        name: data.name,
        email: data.email,
        password: await hashPassword(data.password),
        role: data.role,
        phone: data.phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: created }, { status: 201 })
  } catch (error) {
    console.error('Create team user error:', error)
    return NextResponse.json({ error: 'خطا در ایجاد کاربر' }, { status: 500 })
  }
}
