import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin, hashPassword } from '@/lib/auth'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
}

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') || ''
  const where: any = {}
  if (search) where.OR = [{ name: { contains: search } }, { slug: { contains: search } }]

  const businesses = await prisma.business.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, customers: true, products: true, sales: true } },
    },
  })
  return NextResponse.json({ businesses })
}

export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.name) return NextResponse.json({ error: 'نام کسب‌وکار الزامی است' }, { status: 400 })

    let slug = body.slug ? slugify(body.slug) : slugify(body.name)
    const exists = await prisma.business.findUnique({ where: { slug } })
    if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

    const business = await prisma.business.create({
      data: {
        name: body.name,
        slug,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        website: body.website || null,
        industry: body.industry || null,
        plan: body.plan || 'free',
        planExpiresAt: body.planExpiresAt ? new Date(body.planExpiresAt) : null,
        isActive: body.isActive ?? true,
      },
    })

    // Optionally create the first owner user for the business.
    if (body.ownerName && body.ownerEmail && body.ownerPassword) {
      await prisma.user.create({
        data: {
          businessId: business.id,
          name: body.ownerName,
          email: body.ownerEmail,
          password: await hashPassword(body.ownerPassword),
          role: 'owner',
          phone: body.ownerPhone || null,
        },
      })
    }

    return NextResponse.json({ business }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'خطا در ایجاد کسب‌وکار' }, { status: 500 })
  }
}
