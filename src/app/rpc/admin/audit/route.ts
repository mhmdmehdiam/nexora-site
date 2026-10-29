import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Platform-wide activity log.
 *
 * Every security-relevant action was already being recorded by audit() but
 * nothing could read it — a log nobody can open is not an audit trail.
 */
export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const action = sp.get('action') || ''
  const businessId = sp.get('businessId') || ''
  const take = Math.min(Number(sp.get('take') || 100), 300)
  const cursor = sp.get('cursor') || ''

  const where: any = {}
  if (action) where.action = { contains: action }
  if (businessId) where.businessId = businessId

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      business: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
  })

  const hasMore = logs.length > take
  const rows = hasMore ? logs.slice(0, take) : logs

  return NextResponse.json({
    logs: rows,
    nextCursor: hasMore ? rows[rows.length - 1]?.id : null,
  })
}
