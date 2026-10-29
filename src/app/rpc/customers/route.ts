import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { customerSchema, firstError } from '@/lib/validation'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 100

function clampLimit(raw: number) {
  return Math.min(MAX_LIMIT, Math.max(1, raw || 20))
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') || ''
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1)
  const limit = clampLimit(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10))
  const skip = (page - 1) * limit

  const where: any = { businessId: user.businessId, isActive: true }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        totalSpent: true,
        lastPurchase: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.customer.count({ where }),
  ])

  return NextResponse.json({
    customers,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const parsed = customerSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    }
    const body = parsed.data

    const customer = await prisma.customer.create({
      data: {
        businessId: user.businessId,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        notes: body.notes || null,
        tags: body.tags ? JSON.stringify(body.tags) : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    console.error('Create customer error:', error)
    return NextResponse.json({ error: 'خطا در ایجاد مشتری' }, { status: 500 })
  }
}
