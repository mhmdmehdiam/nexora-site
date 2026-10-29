import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import {
  computeSaleTotals,
  parseMoney,
  parseQuantity,
  resolvePaidAmount,
  resolvePaymentStatus,
  roundHalfUp,
} from '@/lib/money'
import { saleSchema, firstError } from '@/lib/validation'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') || ''
  const status = req.nextUrl.searchParams.get('status') || ''
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20', 10) || 20)
  )

  const where: any = { businessId: user.businessId }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      { customer: { name: { contains: search } } },
    ]
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { saleDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.sale.count({ where }),
  ])

  return NextResponse.json({
    sales,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    taxRate: parseMoney(await getSetting('tax_rate', '10')) ?? 10,
  })
}

/**
 * Atomic per business + year invoice sequence.
 *
 * The previous implementation read the max existing number and added 1,
 * which raced under concurrent writes: 50 simultaneous sales all read the
 * same max and collided on the unique index (P2002) until the 3-attempt
 * retry gave up. PostgreSQL's ON CONFLICT DO UPDATE makes the increment
 * atomic in a single statement — no lock, no retry, no collision.
 */
async function nextInvoiceNumber(
  tx: any,
  businessId: string,
  year: number
): Promise<string> {
  const rows = (await tx.$queryRawUnsafe(
    `INSERT INTO "InvoiceCounter" ("businessId", year, value)
     VALUES ($1, $2, 1)
     ON CONFLICT ("businessId", year)
     DO UPDATE SET value = "InvoiceCounter".value + 1
     RETURNING value`,
    businessId,
    year
  )) as { value: number }[]
  const value = Number(rows[0]?.value ?? 1)
  return `INV-${year}${String(value).padStart(3, '0')}`
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست معتبر نیست' }, { status: 400 })
  }

  try {
    /* ---------- 1. shape validation (Zod) ---------- */
    const parsed = saleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    }
    const rawItems: any[] = parsed.data.items
    if (!parsed.data.customerId) {
      return NextResponse.json({ error: 'انتخاب مشتری الزامی است' }, { status: 400 })
    }

    /* ---------- 2. exact totals ---------- */
    const taxRateSetting = parseMoney(await getSetting('tax_rate', '10')) ?? 10

    const totals = computeSaleTotals({
      lines: rawItems.map((item: any) => ({
        unitPrice: item?.unitPrice,
        quantity: item?.quantity,
        discount: item?.discount,
      })),
      orderDiscount: body?.discount,
      taxRate: taxRateSetting,
    })

    if (totals.errors.length > 0) {
      return NextResponse.json(
        { error: totals.errors[0], details: totals.errors },
        { status: 400 }
      )
    }

    const paidAmount = resolvePaidAmount(totals.total, parseMoney(body?.paidAmount) ?? 0)
    const status = resolvePaymentStatus(totals.total, paidAmount)

    /* ---------- 3. tenant + stock checks ---------- */
    const customer = await prisma.customer.findFirst({
      where: { id: body.customerId, businessId: user.businessId },
      select: { id: true },
    })
    if (!customer) {
      return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 })
    }

    const productIds = [...new Set(rawItems.map((i: any) => String(i?.productId || '')))]
    if (productIds.some((id) => !id)) {
      return NextResponse.json({ error: 'انتخاب کالا برای همه ردیف‌ها الزامی است' }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId: user.businessId },
      select: { id: true, name: true, stock: true, isActive: true },
    })
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'یکی از کالاها یافت نشد' }, { status: 404 })
    }

    const byId = new Map(products.map((p) => [p.id, p]))
    const needed = new Map<string, number>()
    rawItems.forEach((item: any) => {
      const id = String(item.productId)
      needed.set(id, (needed.get(id) || 0) + (parseMoney(item.quantity) ?? 0))
    })

    for (const [id, qty] of needed) {
      const product = byId.get(id)!
      if (!product.isActive) {
        return NextResponse.json({ error: `کالای «${product.name}» غیرفعال است` }, { status: 400 })
      }
      if (product.stock < qty) {
        return NextResponse.json(
          {
            error: `موجودی «${product.name}» کافی نیست (موجود: ${product.stock}، درخواست: ${qty})`,
          },
          { status: 400 }
        )
      }
    }

    /* ---------- 4. atomic write ---------- */
    const year = new Date().getFullYear()
    let sale: any = null
    let lastError: any = null

    for (let attempt = 0; attempt < 3 && !sale; attempt++) {
      try {
        sale = await prisma.$transaction(async (tx) => {
          const invoiceNumber = await nextInvoiceNumber(tx, user.businessId, year)

          const created = await tx.sale.create({
            data: {
              businessId: user.businessId,
              invoiceNumber,
              customerId: customer.id,
              userId: user.id,
              totalAmount: totals.subtotal,
              discount: totals.itemDiscountTotal + totals.orderDiscount,
              tax: totals.tax,
              finalAmount: totals.total,
              paidAmount,
              status,
              paymentMethod: body?.paymentMethod || null,
              notes: body?.notes || null,
              items: {
                create: rawItems.map((item: any, i: number) => ({
                  productId: String(item.productId),
                  quantity: parseQuantity(item.quantity) ?? 0,
                  unitPrice: parseMoney(item.unitPrice) ?? 0,
                  discount: parseMoney(item.discount) ?? 0,
                  total: totals.lineTotals[i],
                })),
              },
            },
            include: { customer: true, items: { include: { product: true } } },
          })

          for (const [productId, qty] of needed) {
            await tx.product.update({
              where: { id: productId },
              data: { stock: { decrement: qty } },
            })
          }

          await tx.customer.update({
            where: { id: customer.id },
            data: {
              totalSpent: { increment: roundHalfUp(totals.total) },
              lastPurchase: new Date(),
            },
          })

          return created
        })
      } catch (e: any) {
        lastError = e
        // P2002 = unique constraint (invoice number raced with another write)
        if (e?.code !== 'P2002') throw e
      }
    }

    if (!sale) {
      console.error('Create sale failed after retries:', lastError)
      return NextResponse.json({ error: 'خطا در ثبت فروش' }, { status: 500 })
    }

    return NextResponse.json({ sale, totals }, { status: 201 })
  } catch (error) {
    console.error('Create sale error:', error)
    return NextResponse.json({ error: 'خطا در ثبت فروش' }, { status: 500 })
  }
}
