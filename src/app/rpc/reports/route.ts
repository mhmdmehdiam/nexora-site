import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { cached } from '@/lib/cache'
import { fromDb, roundHalfUp } from '@/lib/money'
import { jalaliKey, lastJalaliMonths } from '@/lib/jalali'
import { SQL_TEHRAN_DAY, startOfJalaliMonth, addDays } from '@/lib/time'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

function toNum(v: any): number {
  return typeof v === 'bigint' ? Number(v) : Number(v || 0)
}

/** 45s cache — reports are read-heavy and tolerate a little staleness. */
const CACHE_TTL_MS = 45_000

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bid = user.businessId

  try {
    const payload = await cached(`reports:${bid}`, CACHE_TTL_MS, async () => {
      const now = new Date()

      /* ---------- daily revenue, current Jalali month ---------- */
      // PostgreSQL stores DateTime as timestamp(3) in UTC. The SQL_TEHRAN_DAY
      // expression shifts it +03:30 and formats the Tehran wall-clock day.
      const dailyRevenueRaw = await prisma.$queryRawUnsafe<
        { date: string; total: number; count: bigint }[]
      >(
        `SELECT ${SQL_TEHRAN_DAY} as date, SUM("finalAmount") as total, COUNT(*) as count
         FROM "Sale"
         WHERE "businessId" = $1 AND status = 'paid' AND "saleDate" >= $2
         GROUP BY 1 ORDER BY 1`,
        bid,
        startOfJalaliMonth(now)
      )

      const dailyRevenue = dailyRevenueRaw.map((r) => ({
        date: r.date,
        total: fromDb(r.total),
        count: toNum(r.count),
      }))

      /* ---------- customer segments ---------- */
      const [vipCustomers, regularCustomers, newCustomers] = await Promise.all([
        prisma.customer.count({
          where: { businessId: bid, isActive: true, totalSpent: { gte: 50_000_000 } },
        }),
        prisma.customer.count({
          where: { businessId: bid, isActive: true, totalSpent: { gte: 10_000_000, lt: 50_000_000 } },
        }),
        prisma.customer.count({
          where: { businessId: bid, isActive: true, totalSpent: { lt: 10_000_000 } },
        }),
      ])

      /* ---------- monthly comparison (Jalali, last 6 months) ---------- */
      // Six Jalali months never span more than 186 days; fetch a little more and
      // bucket by the Jalali key so a month boundary never splits a bucket.
      const since = addDays(now, -200)
      const monthlySales = await prisma.sale.findMany({
        where: { businessId: bid, status: 'paid', saleDate: { gte: since } },
        select: { saleDate: true, finalAmount: true },
      })

      const buckets = new Map<string, { revenue: number; count: number }>()
      for (const sale of monthlySales) {
        const key = jalaliKey(sale.saleDate)
        const bucket = buckets.get(key) || { revenue: 0, count: 0 }
        bucket.revenue += fromDb(sale.finalAmount)
        bucket.count += 1
        buckets.set(key, bucket)
      }

      const monthlyComparison = lastJalaliMonths(6, now).map((key) => ({
        key,
        revenue: buckets.get(key)?.revenue ?? 0,
        count: buckets.get(key)?.count ?? 0,
      }))

      /* ---------- profit analysis ---------- */
      const profitRows = await prisma.$queryRawUnsafe<
        { name: string; revenue: number; cost: number }[]
      >(
        `SELECT p.name,
                SUM(si.total) as revenue,
                SUM(si.quantity * p.cost) as cost
         FROM "SaleItem" si
         JOIN "Product" p ON si."productId" = p.id
         JOIN "Sale" s ON si."saleId" = s.id
         WHERE s."businessId" = $1 AND s.status = 'paid'
         GROUP BY p.id, p.name
         ORDER BY revenue DESC
         LIMIT 10`,
        bid
      )

      const profitAnalysis = profitRows.map((p) => {
        const revenue = fromDb(p.revenue)
        const cost = fromDb(p.cost)
        const profit = revenue - cost
        return {
          name: p.name,
          revenue,
          cost,
          profit,
          margin: revenue > 0 ? roundHalfUp((profit / revenue) * 100) : 0,
        }
      })

      return {
        dailyRevenue,
        customerSegments: { vip: vipCustomers, regular: regularCustomers, new: newCustomers },
        monthlyComparison,
        profitAnalysis,
        meta: { currency: 'تومان', timezone: 'Asia/Tehran' },
      }
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'خطا در گزارش‌گیری' }, { status: 500 })
  }
}
