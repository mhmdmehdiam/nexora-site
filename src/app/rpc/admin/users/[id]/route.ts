import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin, hashPassword } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const current = await prisma.user.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })

    const data: any = {
      name: body.name ?? current.name,
      role: body.role ?? current.role,
      phone: body.phone ?? current.phone,
      isActive: body.isActive ?? current.isActive,
    }
    if (body.email) data.email = body.email
    if (body.password) data.password = await hashPassword(body.password)

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, businessId: true },
    })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: 'خطا در ویرایش کاربر' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    if (params.id === admin.id) {
      return NextResponse.json({ error: 'نمی‌توانید حساب خودتان را حذف کنید' }, { status: 400 })
    }
    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطا در حذف کاربر' }, { status: 500 })
  }
}
