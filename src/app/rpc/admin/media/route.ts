import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'
import { checkUpload } from '@/lib/upload'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const media = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ media })
}

export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const form = (await req.formData()) as any
    const file = form.get('file') as File | null
    const alt = (form.get('alt') as string) || null

    if (!file) return NextResponse.json({ error: 'فایلی انتخاب نشده' }, { status: 400 })

    const bytes = Buffer.from(await file.arrayBuffer())

    // extension + declared MIME + magic bytes must all agree — a renamed
    // .html or .svg would otherwise be served from our own origin
    const check = checkUpload({ name: file.name, type: file.type, size: file.size, bytes })
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }

    const ext = check.ext!
    const base = path.basename(file.name, ext).replace(/[^\w\u0600-\u06FF-]/g, '-').slice(0, 40)
    const filename = `${Date.now().toString(36)}-${base}${ext}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(path.join(uploadDir, filename), bytes)

    const media = await prisma.media.create({
      data: {
        filename: file.name,
        url: `/uploads/${filename}`,
        mimeType: check.mime!,
        size: file.size,
        alt,
      },
    })
    return NextResponse.json({ media }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'خطا در آپلود فایل' }, { status: 500 })
  }
}
