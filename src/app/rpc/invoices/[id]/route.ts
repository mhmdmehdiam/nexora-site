import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Single invoice, scoped to the caller's business. */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoice = await prisma.invoice.findFirst({
    where: { id: ctx.params.id, businessId: user.businessId },
    include: {
      customer: true,
      items: { include: { product: { select: { name: true, unit: true } } } },
      sale: { select: { saleDate: true, paymentMethod: true } },
      business: {
        select: { name: true, slug: true, phone: true, email: true, address: true, logo: true },
      },
    },
  })

  if (!invoice) return NextResponse.json({ error: 'فاکتور پیدا نشد' }, { status: 404 })

  return NextResponse.json({ invoice })
}
