import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
}

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') || ''
  const status = req.nextUrl.searchParams.get('status') || ''
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1))
  const perPage = Math.min(50, Math.max(5, Number(req.nextUrl.searchParams.get('perPage') || 10)))

  const where: any = {}
  if (search) where.OR = [{ title: { contains: search } }, { slug: { contains: search } }]
  if (status) where.status = status

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.post.count({ where }),
  ])

  return NextResponse.json({ posts, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) })
}

export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.title) return NextResponse.json({ error: 'عنوان الزامی است' }, { status: 400 })

    let slug = body.slug ? slugify(body.slug) : slugify(body.title)
    const exists = await prisma.post.findUnique({ where: { slug } })
    if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

    const post = await prisma.post.create({
      data: {
        title: body.title,
        slug,
        excerpt: body.excerpt || null,
        content: body.content || '',
        coverImage: body.coverImage || null,
        category: body.category || null,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        status: body.status || 'draft',
        authorName: admin.name,
        publishedAt: body.status === 'published' ? new Date() : null,
      },
    })
    return NextResponse.json({ post }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'خطا در ایجاد نوشته' }, { status: 500 })
  }
}
