import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    businesses, activeBusinesses, users, customers, products, sales, posts, pages, media,
    subscriptions, recentBusinesses, planBreakdown,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.sale.findMany({ select: { finalAmount: true, saleDate: true, status: true } }),
    prisma.post.count(),
    prisma.page.count(),
    prisma.media.count(),
    prisma.subscription.findMany({
      include: { business: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.business.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, name: true, slug: true, plan: true, isActive: true, createdAt: true },
    }),
    prisma.business.groupBy({ by: ['plan'], _count: { _all: true } }),
  ])

  const totalRevenue = sales.reduce((s, x) => s + (x.finalAmount || 0), 0)
  const paidRevenue = sales.filter(s => s.status === 'paid').reduce((s, x) => s + (x.finalAmount || 0), 0)

  const now = new Date()
  const monthly: { month: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const total = sales
      .filter(s => s.saleDate >= d && s.saleDate < next)
      .reduce((sum, x) => sum + (x.finalAmount || 0), 0)
    monthly.push({ month: new Intl.DateTimeFormat('fa-IR', { month: 'short' }).format(d), total })
  }

  return NextResponse.json({
    stats: {
      businesses, activeBusinesses, users, customers, products,
      salesCount: sales.length, totalRevenue, paidRevenue,
      pendingRevenue: totalRevenue - paidRevenue,
      posts, pages, media,
    },
    monthly,
    subscriptions,
    recentBusinesses,
    planBreakdown: planBreakdown.map(p => ({ plan: p.plan, count: p._count._all })),
  })
}
