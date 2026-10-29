import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, hashPassword } from '@/lib/auth'
import { z } from 'zod'

/**
 * Update / delete a team member — tenant-scoped.
 *
 * Guard rails:
 * - only owner/admin of the same business
 * - cannot edit or delete yourself through this route (use settings)
 * - admin cannot promote anyone to owner, nor touch the owner
 * - the last owner cannot be deleted
 */

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  role: z.enum(['admin', 'manager', 'user']).optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/)
    .optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getAuthUser(req)
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'owner' && me.role !== 'admin') {
    return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 403 })
  }
  if (params.id === me.id) {
    return NextResponse.json({ error: 'برای ویرایش حساب خودت از تنظیمات استفاده کن' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست معتبر نیست' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'ورودی نامعتبر' }, { status: 400 })
  }
  const patch = parsed.data

  try {
    const target = await prisma.user.findFirst({
      where: { id: params.id, businessId: me.businessId },
      select: { id: true, role: true, email: true },
    })
    if (!target) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 })

    // an admin can only manage non-owner, non-admin accounts
    if (me.role === 'admin' && target.role !== 'user' && target.role !== 'manager') {
      return NextResponse.json({ error: 'دسترسی به این کاربر ندارید' }, { status: 403 })
    }
    // an admin cannot promote someone to admin
    if (me.role === 'admin' && patch.role === 'admin') {
      return NextResponse.json({ error: 'فقط مالک می‌تواند مدیر بسازد' }, { status: 403 })
    }

    // email uniqueness inside the tenant
    if (patch.email && patch.email !== target.email) {
      const dup = await prisma.user.findFirst({
        where: { businessId: me.businessId, email: patch.email, id: { not: target.id } },
        select: { id: true },
      })
      if (dup) return NextResponse.json({ error: 'این ایمیل قبلاً ثبت شده' }, { status: 409 })
    }

    const data: any = {}
    if (patch.name !== undefined) data.name = patch.name
    if (patch.email !== undefined) data.email = patch.email
    if (patch.phone !== undefined) data.phone = patch.phone || null
    if (patch.role !== undefined) data.role = patch.role
    if (patch.isActive !== undefined) data.isActive = patch.isActive
    if (patch.password) data.password = await hashPassword(patch.password)

    const updated = await prisma.user.update({
      where: { id: target.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Update team user error:', error)
    return NextResponse.json({ error: 'خطا در ویرایش کاربر' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getAuthUser(req)
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'owner' && me.role !== 'admin') {
    return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 403 })
  }
  if (params.id === me.id) {
    return NextResponse.json({ error: 'نمی‌توانی حساب خودت را حذف کنی' }, { status: 400 })
  }

  try {
    const target = await prisma.user.findFirst({
      where: { id: params.id, businessId: me.businessId },
      select: { id: true, role: true },
    })
    if (!target) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 })

    if (me.role === 'admin' && target.role !== 'user' && target.role !== 'manager') {
      return NextResponse.json({ error: 'دسترسی به این کاربر ندارید' }, { status: 403 })
    }

    // never delete the last owner of a business
    if (target.role === 'owner') {
      const owners = await prisma.user.count({
        where: { businessId: me.businessId, role: 'owner' },
      })
      if (owners <= 1) {
        return NextResponse.json({ error: 'آخرین مالک کسب‌وکار را نمی‌توان حذف کرد' }, { status: 400 })
      }
    }

    await prisma.user.delete({ where: { id: target.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete team user error:', error)
    return NextResponse.json({ error: 'خطا در حذف کاربر' }, { status: 500 })
  }
}
