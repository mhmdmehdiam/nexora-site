import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { customerSchema, firstError } from '@/lib/validation'
import { audit } from '@/lib/audit'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

/**
 * Tenant isolation: every lookup is scoped by businessId. A foreign id is
 * indistinguishable from a nonexistent one (404) — never a 403, which would
 * confirm the resource exists.
 */
function findOwned(id: string, businessId: string) {
  return prisma.customer.findFirst({ where: { id, businessId } })
}

// GET single customer
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customer = await findOwned(params.id, user.businessId)
  if (!customer) {
    return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 })
  }

  const [sales, reminders] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId: user.businessId, customerId: customer.id },
      take: 10,
      orderBy: { saleDate: 'desc' },
      include: { items: { include: { product: { select: { name: true } } } } },
    }),
    prisma.paymentReminder.findMany({
      where: { businessId: user.businessId, customerId: customer.id, isCompleted: false },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  return NextResponse.json({ customer: { ...customer, sales, reminders } })
}

// PUT update customer
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await findOwned(params.id, user.businessId)
  if (!existing) return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 })

  try {
    const parsed = customerSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    }
    const body = parsed.data

    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        notes: body.notes || null,
        tags: body.tags ? JSON.stringify(body.tags) : null,
      },
    })

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json({ error: 'خطا در بروزرسانی' }, { status: 500 })
  }
}

// DELETE (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await findOwned(params.id, user.businessId)
  if (!existing) return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 })

  await prisma.customer.update({
    where: { id: existing.id },
    data: { isActive: false },
  })

  await audit({
    businessId: user.businessId,
    userId: user.id,
    action: 'customer.delete',
    entity: 'customer',
    entityId: existing.id,
    req,
  })

  return NextResponse.json({ success: true })
}
