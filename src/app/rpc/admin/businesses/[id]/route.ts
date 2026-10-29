import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      subscriptions: { orderBy: { createdAt: 'desc' } },
      _count: { select: { users: true, customers: true, products: true, sales: true } },
    },
  })
  if (!business) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })
  return NextResponse.json({ business })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const current = await prisma.business.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })

    const business = await prisma.business.update({
      where: { id: params.id },
      data: {
        name: body.name ?? current.name,
        email: body.email ?? current.email,
        phone: body.phone ?? current.phone,
        address: body.address ?? current.address,
        city: body.city ?? current.city,
        website: body.website ?? current.website,
        industry: body.industry ?? current.industry,
        plan: body.plan ?? current.plan,
        isActive: body.isActive ?? current.isActive,
        planExpiresAt: body.planExpiresAt !== undefined
          ? (body.planExpiresAt ? new Date(body.planExpiresAt) : null)
          : current.planExpiresAt,
      },
    })
    return NextResponse.json({ business })
  } catch {
    return NextResponse.json({ error: 'خطا در ویرایش کسب‌وکار' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const target = await prisma.business.findUnique({ where: { id: params.id } })
    if (!target) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })
    if (target.slug === 'nexora-platform') {
      return NextResponse.json({ error: 'کسب‌وکار پلتفرم قابل حذف نیست' }, { status: 400 })
    }
    await prisma.business.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطا در حذف کسب‌وکار' }, { status: 500 })
  }
}
