import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { parseMoney } from '@/lib/money'
import { reminderSchema, firstError } from '@/lib/validation'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reminders = await prisma.paymentReminder.findMany({
    where: { isCompleted: false, businessId: user.businessId },
    orderBy: { dueDate: 'asc' },
    include: { customer: { select: { name: true, phone: true } } },
  })

  return NextResponse.json({ reminders })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const parsed = reminderSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    }
    const body = parsed.data

    const dueDate = new Date(body.dueDate)
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'تاریخ یادآوری معتبر نیست' }, { status: 400 })
    }

    // Tenant integrity: the customer must belong to this business.
    const customer = await prisma.customer.findFirst({
      where: { id: body.customerId, businessId: user.businessId },
      select: { id: true },
    })
    if (!customer) {
      return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 })
    }

    const reminder = await prisma.paymentReminder.create({
      data: {
        businessId: user.businessId,
        customerId: customer.id,
        userId: user.id,
        amount: parseMoney(body.amount) ?? 0,
        description: body.description,
        dueDate,
        isRecurring: body.isRecurring || false,
        recurringInterval: body.recurringInterval || null,
      },
      include: { customer: true },
    })

    return NextResponse.json({ reminder }, { status: 201 })
  } catch (error) {
    console.error('Create reminder error:', error)
    return NextResponse.json({ error: 'خطا در ایجاد یادآوری' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (typeof body?.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'شناسه یادآوری معتبر نیست' }, { status: 400 })
  }

  const result = await prisma.paymentReminder.updateMany({
    where: { id: body.id, businessId: user.businessId },
    data: { isCompleted: true },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: 'یادآوری یافت نشد' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
