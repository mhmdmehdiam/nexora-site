import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { getSettings, setSettings } from '@/lib/settings'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getSettings()
  return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.settings || typeof body.settings !== 'object') {
      return NextResponse.json({ error: 'تنظیمات نامعتبر' }, { status: 400 })
    }
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(body.settings)) clean[k] = String(v ?? '')
    await setSettings(clean)
    return NextResponse.json({ ok: true, settings: await getSettings() })
  } catch {
    return NextResponse.json({ error: 'خطا در ذخیره تنظیمات' }, { status: 500 })
  }
}
