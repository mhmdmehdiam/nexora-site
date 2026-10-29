import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { gatewayMode } from '@/lib/zarinpal'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

/** Payment history for the current business. */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payments = await prisma.payment.findMany({
    where: { businessId: user.businessId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      plan: true,
      amount: true,
      status: true,
      refId: true,
      cardPan: true,
      createdAt: true,
      paidAt: true,
    },
  })

  return NextResponse.json({ payments, gateway: gatewayMode() })
}
