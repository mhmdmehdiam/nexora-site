import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

// Public endpoint: header/footer navigation for the landing page.
export async function GET() {
  const items = await prisma.menuItem.findMany({
    where: { isActive: true },
    orderBy: [{ location: 'asc' }, { order: 'asc' }],
  })
  return NextResponse.json({
    header: items.filter(i => i.location === 'header').map(i => ({ label: i.label, href: i.url })),
    footer: items.filter(i => i.location === 'footer').map(i => ({ label: i.label, href: i.url })),
  })
}
