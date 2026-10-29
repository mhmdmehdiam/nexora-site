import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const location = req.nextUrl.searchParams.get('location') || ''
  const where: any = {}
  if (location) where.location = location

  const items = await prisma.menuItem.findMany({ where, orderBy: [{ location: 'asc' }, { order: 'asc' }] })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.label || !body.url) {
      return NextResponse.json({ error: 'عنوان و لینک الزامی است' }, { status: 400 })
    }
    const count = await prisma.menuItem.count({ where: { location: body.location || 'header' } })
    const item = await prisma.menuItem.create({
      data: {
        label: body.label,
        url: body.url,
        location: body.location || 'header',
        order: body.order ?? count,
        isActive: body.isActive ?? true,
      },
    })
    return NextResponse.json({ item }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'خطا در ایجاد آیتم منو' }, { status: 500 })
  }
}
