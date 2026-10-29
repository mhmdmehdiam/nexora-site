import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings'
import { mergeSiteContent, SITE_CONTENT_KEY, type SiteContent } from '@/lib/site-content'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

// Public endpoint: the landing page reads its editable content from here.
export async function GET() {
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
