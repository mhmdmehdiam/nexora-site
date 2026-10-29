import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { parseMoney, parseQuantity } from '@/lib/money'
import { productSchema, firstError } from '@/lib/validation'
import { audit } from '@/lib/audit'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

/** Tenant isolation — foreign ids are 404s, never 403s. */
function findOwned(id: string, businessId: string) {
  return prisma.product.findFirst({ where: { id, businessId } })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const product = await findOwned(params.id, user.businessId)

  if (!product) return NextResponse.json({ error: 'محصول یافت نشد' }, { status: 404 })

  const saleItems = await prisma.saleItem.findMany({
    where: { productId: product.id, sale: { businessId: user.businessId } },
    take: 10,
    orderBy: { sale: { saleDate: 'desc' } },
    include: {
      sale: { select: { invoiceNumber: true, saleDate: true, customer: { select: { name: true } } } },
    },
  })

  return NextResponse.json({ product: { ...product, saleItems } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await findOwned(params.id, user.businessId)
  if (!existing) return NextResponse.json({ error: 'محصول یافت نشد' }, { status: 404 })

  try {
    const parsed = productSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    }
    const body = parsed.data

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
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
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'خطا در ویرایش محصول' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await findOwned(params.id, user.businessId)
  if (!existing) return NextResponse.json({ error: 'محصول یافت نشد' }, { status: 404 })

  await prisma.product.update({ where: { id: existing.id }, data: { isActive: false } })

  await audit({
    businessId: user.businessId,
    userId: user.id,
    action: 'product.delete',
    entity: 'product',
    entityId: existing.id,
    req,
  })

  return NextResponse.json({ success: true })
}
