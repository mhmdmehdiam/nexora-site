import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'
import { parseMoney } from '@/lib/money'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: 'desc' },
    include: { business: { select: { id: true, name: true, slug: true } } },
  })
  return NextResponse.json({ subscriptions })
}

export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.businessId || !body.plan) {
      return NextResponse.json({ error: 'کسب‌وکار و پلن الزامی است' }, { status: 400 })
    }
    const subscription = await prisma.subscription.create({
      data: {
        businessId: body.businessId,
        plan: body.plan,
        amount: parseMoney(body.amount) ?? 0,
        currency: body.currency || 'IRR',
        status: body.status || 'active',
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    })
    return NextResponse.json({ subscription }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'خطا در ایجاد اشتراک' }, { status: 500 })
  }
}
