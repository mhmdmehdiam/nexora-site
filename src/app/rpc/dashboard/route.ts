import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { cached } from '@/lib/cache'
import { balanceOf, fromDb, percentChange } from '@/lib/money'
import { jalaliKey, jalaliMonthName, lastJalaliMonths } from '@/lib/jalali'
import { addDays, startOfTehranGregorianMonth } from '@/lib/time'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

function toNum(v: any): number {
  return typeof v === 'bigint' ? Number(v) : Number(v || 0)
}

/** 30s cache — dashboard aggregates are the heaviest read path. */
const CACHE_TTL_MS = 30_000

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const bid = user.businessId

    const payload = await cached(`dashboard:${bid}`, CACHE_TTL_MS, async () => {
      const now = new Date()
      const startOfMonth = startOfTehranGregorianMonth(now)
      const startOfLastMonth = startOfTehranGregorianMonth(
        new Date(now.getFullYear(), now.getMonth() - 1, 15)
      )
      const endOfLastMonth = new Date(startOfMonth.getTime() - 1)

      const [
        currentMonthSales,
        lastMonthSales,
        totalCustomers,
        lowStock,
        pendingPayments,
        recentSales,
      ] = await Promise.all([
        prisma.sale.aggregate({
          where: {
            businessId: bid,
            saleDate: { gte: startOfMonth },
            status: { not: 'cancelled' },
          },
          _sum: { finalAmount: true },
          _count: true,
        }),
        prisma.sale.aggregate({
          where: {
            businessId: bid,
            saleDate: { gte: startOfLastMonth, lte: endOfLastMonth },
            status: { not: 'cancelled' },
          },
          _sum: { finalAmount: true },
          _count: true,
        }),
        prisma.customer.count({ where: { businessId: bid, isActive: true } }),
        prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM "Product"
           WHERE "businessId" = $1 AND "isActive" = true AND stock <= "minStock"`,
          bid
        ),
        prisma.sale.aggregate({
          where: { businessId: bid, status: { in: ['pending', 'partial'] } },
          _sum: { finalAmount: true, paidAmount: true },
        }),
        prisma.sale.findMany({
          where: { businessId: bid },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { customer: { select: { name: true } } },
        }),
      ])

      /* ---------- monthly series (Jalali, last 6 months) ---------- */
      const since = addDays(now, -200)
      const [monthlyRows, topProductsRaw, salesByCategoryRaw, paymentMethodsRaw] =
        await Promise.all([
          prisma.sale.findMany({
            where: {
              businessId: bid,
              saleDate: { gte: since },
              status: { not: 'cancelled' },
            },
            select: { saleDate: true, finalAmount: true },
          }),
          prisma.$queryRawUnsafe<{ name: string; total: number; qty: bigint }[]>(
            `SELECT p.name, SUM(si.total) as total, SUM(si.quantity) as qty
             FROM "SaleItem" si
             JOIN "Product" p ON si."productId" = p.id
             JOIN "Sale" s ON si."saleId" = s.id
             WHERE s."businessId" = $1 AND s.status != 'cancelled'
             GROUP BY p.id, p.name ORDER BY total DESC LIMIT 5`,
            bid
          ),
          prisma.$queryRawUnsafe<{ category: string | null; total: number }[]>(
            `SELECT p.category, SUM(si.total) as total
             FROM "SaleItem" si
             JOIN "Product" p ON si."productId" = p.id
             JOIN "Sale" s ON si."saleId" = s.id
             WHERE s."businessId" = $1 AND s.status != 'cancelled'
             GROUP BY p.category ORDER BY total DESC`,
            bid
          ),
          prisma.$queryRawUnsafe<{ method: string; count: bigint; total: number }[]>(
            `SELECT "paymentMethod" as method, COUNT(*) as count, SUM("finalAmount") as total
             FROM "Sale"
             WHERE "businessId" = $1 AND status != 'cancelled' AND "paymentMethod" IS NOT NULL
             GROUP BY "paymentMethod"`,
            bid
          ),
        ])

      const buckets = new Map<string, { total: number; count: number }>()
      for (const row of monthlyRows) {
        const key = jalaliKey(row.saleDate)
        const bucket = buckets.get(key) || { total: 0, count: 0 }
        bucket.total += fromDb(row.finalAmount)
        bucket.count += 1
        buckets.set(key, bucket)
      }

      const monthlySales = lastJalaliMonths(6, now).map((key) => {
        const [, m] = key.split('-').map(Number)
        return {
          month: jalaliMonthName(m),
          key,
          total: buckets.get(key)?.total ?? 0,
          count: buckets.get(key)?.count ?? 0,
        }
      })

      const currentRevenue = fromDb(currentMonthSales._sum.finalAmount)
      const lastRevenue = fromDb(lastMonthSales._sum.finalAmount)

      const pendingTotal = fromDb(pendingPayments._sum.finalAmount)
      const pendingPaid = fromDb(pendingPayments._sum.paidAmount)

      return {
        stats: {
          currentRevenue,
          lastRevenue,
          revenueChange: percentChange(currentRevenue, lastRevenue),
          currentSalesCount: currentMonthSales._count,
          lastSalesCount: lastMonthSales._count,
          totalCustomers,
          lowStockCount: toNum(lowStock[0]?.count),
          pendingAmount: balanceOf(pendingTotal, pendingPaid),
        },
        monthlySales,
        recentSales,
        topProducts: topProductsRaw.map((r) => ({
          name: r.name,
          total: fromDb(r.total),
          qty: toNum(r.qty),
        })),
        salesByCategory: salesByCategoryRaw.map((r) => ({
          category: r.category || 'بدون دسته',
          total: fromDb(r.total),
        })),
        paymentMethods: paymentMethodsRaw.map((r) => ({
          method: r.method,
          count: toNum(r.count),
          total: fromDb(r.total),
        })),
        meta: { currency: 'تومان', timezone: 'Asia/Tehran' },
      }
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'خطا در دریافت اطلاعات' }, { status: 500 })
  }
}
