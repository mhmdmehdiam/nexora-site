import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const post = await prisma.post.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })
  return NextResponse.json({ post })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const current = await prisma.post.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })

    const becomingPublished = body.status === 'published' && current.status !== 'published'

    const post = await prisma.post.update({
      where: { id: params.id },
      data: {
        title: body.title ?? current.title,
        slug: body.slug ? body.slug : current.slug,
        excerpt: body.excerpt ?? current.excerpt,
        content: body.content ?? current.content,
        coverImage: body.coverImage ?? current.coverImage,
        category: body.category ?? current.category,
        tags: body.tags !== undefined ? (body.tags ? JSON.stringify(body.tags) : null) : current.tags,
        status: body.status ?? current.status,
        publishedAt: becomingPublished ? new Date() : current.publishedAt,
      },
    })
    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'خطا در ویرایش نوشته' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.post.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطا در حذف نوشته' }, { status: 500 })
  }
}
