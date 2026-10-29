import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const page = await prisma.page.findUnique({ where: { id: params.id } })
  if (!page) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })
  return NextResponse.json({ page })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const current = await prisma.page.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })

    const page = await prisma.page.update({
      where: { id: params.id },
      data: {
        title: body.title ?? current.title,
        slug: body.slug || current.slug,
        content: body.content ?? current.content,
        status: body.status ?? current.status,
        seoTitle: body.seoTitle ?? current.seoTitle,
        seoDesc: body.seoDesc ?? current.seoDesc,
      },
    })
    return NextResponse.json({ page })
  } catch {
    return NextResponse.json({ error: 'خطا در ویرایش برگه' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.page.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطا در حذف برگه' }, { status: 500 })
  }
}
