import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const current = await prisma.menuItem.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })

    const item = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        label: body.label ?? current.label,
        url: body.url ?? current.url,
        location: body.location ?? current.location,
        order: body.order ?? current.order,
        isActive: body.isActive ?? current.isActive,
      },
    })
    return NextResponse.json({ item })
  } catch {
    return NextResponse.json({ error: 'خطا در ویرایش آیتم منو' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.menuItem.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطا در حذف آیتم منو' }, { status: 500 })
  }
}
