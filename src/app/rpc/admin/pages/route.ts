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

  const pages = await prisma.page.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ pages })
}

export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.title) return NextResponse.json({ error: 'عنوان الزامی است' }, { status: 400 })

    let slug = body.slug ? slugify(body.slug) : slugify(body.title)
    const exists = await prisma.page.findUnique({ where: { slug } })
    if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

    const page = await prisma.page.create({
      data: {
        title: body.title,
        slug,
        content: body.content || '',
        status: body.status || 'draft',
        seoTitle: body.seoTitle || null,
        seoDesc: body.seoDesc || null,
      },
    })
    return NextResponse.json({ page }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'خطا در ایجاد برگه' }, { status: 500 })
  }
}
