import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { parseMoney, parseQuantity } from '@/lib/money'
import { productSchema, firstError } from '@/lib/validation'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 100

function clampLimit(raw: number) {
  return Math.min(MAX_LIMIT, Math.max(1, raw || 50))
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') || ''
  const category = req.nextUrl.searchParams.get('category') || ''
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1)
  const limit = clampLimit(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10))
  const skip = (page - 1) * limit

  const where: any = { businessId: user.businessId, isActive: true }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (category) where.category = category

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        price: true,
        cost: true,
        stock: true,
        minStock: true,
        unit: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where: { businessId: user.businessId, isActive: true },
      select: { category: true },
      distinct: ['category'],
    }),
  ])

  return NextResponse.json({
    products,
    categories: categories.map((c) => c.category).filter(Boolean),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const parsed = productSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    }
    const body = parsed.data

    const product = await prisma.product.create({
      data: {
        businessId: user.businessId,
        name: body.name,
        sku: body.sku || null,
        description: body.description || null,
        category: body.category || null,
        price: parseMoney(body.price) ?? 0,
        cost: parseMoney(body.cost) ?? 0,
        stock: parseQuantity(body.stock) ?? 0,
        minStock: parseQuantity(body.minStock) ?? 0,
        unit: body.unit || 'عدد',
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        price: true,
        stock: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'خطا در ایجاد محصول' }, { status: 500 })
  }
}
