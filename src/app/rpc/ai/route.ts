import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getPlanLimits } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { fromDb, roundHalfUp } from '@/lib/money'
import { generateLlmInsights, llmEnabled } from '@/lib/ai'

function toNum(v: any): number {
  return typeof v === 'bigint' ? Number(v) : v || 0
}

/**
 * AI sales analysis.
 *
 * Two layers:
 *   1. deterministic aggregates (always run — these are the numbers)
 *   2. insights — LLM when LLM_API_KEY is set, otherwise the rule-based
 *      copy that has always shipped. A failing/slow LLM never breaks the
 *      endpoint: we fall back and label the response `source: 'rules'`.
 */

function ruleBasedInsights(args: {
  growthRate: number
  lowStockCount: number
  repeatCustomerCount: number
}): string[] {
  const out: string[] = []
  const g = Math.round(args.growthRate)

  if (args.growthRate > 10) {
    out.push(`📈 رشد فروش ${g}٪ نسبت به ماه قبل — عملکرد عالی!`)
  } else if (args.growthRate < -10) {
    out.push(`⚠️ کاهش فروش ${Math.abs(g)}٪ نسبت به ماه قبل — نیاز به بررسی`)
  } else {
    out.push(`📊 فروش نسبتاً پایدار با ${g}٪ تغییر`)
  }

  if (args.lowStockCount > 0) {
    out.push(`🔴 ${args.lowStockCount} محصول موجودی کم دارند — تامین کنید`)
  }
  if (args.repeatCustomerCount > 3) {
    out.push(`👥 ${args.repeatCustomerCount} مشتری تکراری در ۳۰ روز اخیر — وفاداری خوب`)
  }
  return out
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limits = getPlanLimits(user.businessPlan)
  if (!limits.ai) {
    return NextResponse.json(
      { error: 'تحلیل هوشمند در پلن فعلی فعال نیست — به پلن حرفه‌ای ارتقا دهید' },
      { status: 403 }
    )
  }

  const rl = await rateLimit(`ai:${user.businessId}`, 20, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `تعداد درخواست‌ها زیاد است؛ ${rl.retryAfterSec} ثانیه دیگر تلاش کن` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const full = body?.type === 'full'

    const now = new Date()
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000
    const sixtyDaysAgo = now.getTime() - 60 * 24 * 60 * 60 * 1000
    const bid = user.businessId

    const [recent, previous] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          businessId: bid,
          saleDate: { gte: new Date(thirtyDaysAgo) },
          status: { not: 'cancelled' },
        },
        _sum: { finalAmount: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: {
          businessId: bid,
          saleDate: { gte: new Date(sixtyDaysAgo), lt: new Date(thirtyDaysAgo) },
          status: { not: 'cancelled' },
        },
        _sum: { finalAmount: true },
        _count: true,
      }),
    ])

    const recentRevenue = fromDb(recent._sum.finalAmount)
    const previousRevenue = fromDb(previous._sum.finalAmount)
    const growthRate =
      previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    const topProductsRaw = await prisma.$queryRawUnsafe<
      { name: string; qty: number; revenue: number }[]
    >(
      `SELECT p.name, SUM(si.quantity) as qty, SUM(si.total) as revenue
       FROM "SaleItem" si JOIN "Product" p ON si."productId" = p.id
       JOIN "Sale" s ON si."saleId" = s.id
       WHERE s."businessId" = $1 AND s."saleDate" >= $2 AND s.status != 'cancelled'
       GROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 5`,
      bid,
      new Date(thirtyDaysAgo)
    )
    const topProducts = topProductsRaw.map((p) => ({
      ...p,
      qty: toNum(p.qty),
      revenue: fromDb(p.revenue),
    }))

    const repeatCustomersRaw = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM (
        SELECT "customerId", COUNT(*) as cnt FROM "Sale"
        WHERE "businessId" = $1 AND "saleDate" >= $2 AND status != 'cancelled'
        GROUP BY "customerId" HAVING COUNT(*) > 1
      ) t`,
      bid,
      new Date(thirtyDaysAgo)
    )
    const repeatCustomerCount = toNum(repeatCustomersRaw[0]?.count)

    const lowStockProducts = await prisma.$queryRawUnsafe<
      { name: string; stock: number; minStock: number }[]
    >(
      `SELECT name, stock, "minStock" FROM "Product"
       WHERE "businessId" = $1 AND "isActive" = true AND stock <= "minStock"
       ORDER BY stock ASC`,
      bid
    )

    const predictedRevenue = roundHalfUp(recentRevenue * (1 + growthRate / 100))

    let categoryBreakdown: { category: string | null; revenue: number }[] = []
    if (full) {
      const categoryData = await prisma.$queryRawUnsafe<
        { category: string | null; revenue: number }[]
      >(
        `SELECT p.category, SUM(si.total) as revenue
         FROM "SaleItem" si JOIN "Product" p ON si."productId" = p.id
         JOIN "Sale" s ON si."saleId" = s.id
         WHERE s."businessId" = $1 AND s."saleDate" >= $2 AND s.status != 'cancelled'
         GROUP BY p.category ORDER BY revenue DESC`,
        bid,
        new Date(thirtyDaysAgo)
      )
      categoryBreakdown = categoryData.map((c) => ({ ...c, revenue: fromDb(c.revenue) }))
    }

    /* ---------- insights: LLM first, rules as fallback ---------- */
    const rules = ruleBasedInsights({
      growthRate,
      lowStockCount: lowStockProducts.length,
      repeatCustomerCount,
    })

    let insights = rules
    let source: 'llm' | 'rules' = 'rules'
    let model: string | undefined
    let llmError: string | undefined

    if (llmEnabled()) {
      const llm = await generateLlmInsights({
        recentRevenue,
        previousRevenue,
        growthRate,
        recentSalesCount: recent._count,
        predictedNextMonth: predictedRevenue,
        repeatCustomerCount,
        topProducts,
        lowStockProducts,
        categoryBreakdown,
      })
      if (llm.ok) {
        insights = llm.insights
        source = 'llm'
        model = llm.model
      } else {
        llmError = llm.error
      }
    }

    const payload: any = {
      summary: {
        recentRevenue,
        previousRevenue,
        growthRate: Math.round(growthRate * 10) / 10,
        recentSalesCount: recent._count,
        predictedNextMonth: predictedRevenue,
        repeatCustomerCount,
      },
      insights,
      insightsSource: source,
      topProducts,
      lowStockProducts,
    }

    if (full) payload.categoryBreakdown = categoryBreakdown
    if (model) payload.model = model
    if (llmError) payload.llmError = llmError

    return NextResponse.json(payload)
  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json({ error: 'خطا در تحلیل' }, { status: 500 })
  }
}
