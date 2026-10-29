import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/auth'
import { getSetting, setSetting } from '@/lib/settings'
import { mergeSiteContent, SITE_CONTENT_KEY, type SiteContent } from '@/lib/site-content'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await getSetting(SITE_CONTENT_KEY, '')
  let saved: Partial<SiteContent> | null = null
  if (raw) {
    try {
      saved = JSON.parse(raw)
    } catch {
      saved = null
    }
  }
  return NextResponse.json({ content: mergeSiteContent(saved) })
}

export async function PUT(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const content = body.content as Partial<SiteContent>
    if (!content || typeof content !== 'object') {
      return NextResponse.json({ error: 'محتوای نامعتبر' }, { status: 400 })
    }
    await setSetting(SITE_CONTENT_KEY, JSON.stringify(content))

    // the landing page is ISR-cached — drop it so the edit is visible now
    revalidatePath('/')
    revalidatePath('/pricing')

    return NextResponse.json({ ok: true, content: mergeSiteContent(content) })
  } catch {
    return NextResponse.json({ error: 'خطا در ذخیره محتوا' }, { status: 500 })
  }
}
