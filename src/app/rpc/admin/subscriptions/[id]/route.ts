import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'
import { parseMoney } from '@/lib/money'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const current = await prisma.subscription.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })

    const subscription = await prisma.subscription.update({
      where: { id: params.id },
      data: {
        plan: body.plan ?? current.plan,
        amount: body.amount !== undefined ? (parseMoney(body.amount) ?? 0) : current.amount,
        status: body.status ?? current.status,
        endDate: body.endDate !== undefined
          ? (body.endDate ? new Date(body.endDate) : null)
          : current.endDate,
      },
    })
    return NextResponse.json({ subscription })
  } catch {
    return NextResponse.json({ error: 'خطا در ویرایش اشتراک' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.subscription.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطا در حذف اشتراک' }, { status: 500 })
  }
}
