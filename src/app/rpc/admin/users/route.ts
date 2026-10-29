import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin, hashPassword } from '@/lib/auth'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') || ''
  const where: any = {}
  if (search) {
    where.OR = [{ name: { contains: search } }, { email: { contains: search } }]
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, role: true, isActive: true, phone: true, createdAt: true,
      businessId: true,
      business: { select: { name: true, slug: true, plan: true } },
    },
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.name || !body.email || !body.password || !body.businessId) {
      return NextResponse.json({ error: 'نام، ایمیل، رمز و کسب‌وکار الزامی است' }, { status: 400 })
    }

    const exists = await prisma.user.findFirst({ where: { email: body.email, businessId: body.businessId } })
    if (exists) return NextResponse.json({ error: 'این ایمیل قبلاً ثبت شده است' }, { status: 400 })

    const user = await prisma.user.create({
      data: {
        businessId: body.businessId,
        name: body.name,
        email: body.email,
        password: await hashPassword(body.password),
        role: body.role || 'user',
        phone: body.phone || null,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, businessId: true },
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'خطا در ایجاد کاربر' }, { status: 500 })
  }
}
