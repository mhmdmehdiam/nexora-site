import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/auth'
import { getSettings, setSettings } from '@/lib/settings'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

const SEO_KEYS = ['seo_title', 'seo_description', 'seo_keywords', 'seo_og_image', 'seo_robots', 'site_url']

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = await getSettings()
  const seo: Record<string, string> = {}
  for (const k of SEO_KEYS) seo[k] = all[k] ?? ''
  return NextResponse.json({ seo })
}

export async function PUT(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const incoming = body.seo || {}
    const clean: Record<string, string> = {}
    for (const k of SEO_KEYS) if (incoming[k] !== undefined) clean[k] = String(incoming[k])
    await setSettings(clean)

    // The landing page is ISR-cached (revalidate = 60). Without this the
    // admin would save a new title and not see it for up to a minute — which
    // reads as "the form doesn't work".
    revalidatePath('/')

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطا در ذخیره سئو' }, { status: 500 })
  }
}
