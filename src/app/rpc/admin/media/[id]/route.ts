import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const media = await prisma.media.findUnique({ where: { id: params.id } })
    if (!media) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })

    // Best-effort remove the file from disk; ignore if already gone.
    try {
      const filePath = path.join(process.cwd(), 'public', media.url.replace(/^\//, ''))
      await fs.unlink(filePath)
    } catch {
      /* ignore */
    }

    await prisma.media.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطا در حذف فایل' }, { status: 500 })
  }
}
