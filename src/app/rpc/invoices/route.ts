import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { computeSaleTotals, parseMoney, parseQuantity, roundHalfUp, resolvePaymentStatus } from '@/lib/money'
import { invoiceSchema, firstError } from '@/lib/validation'

// Always evaluated per request — never prerendered at build time, so a build
// never depends on a live database.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || ''
  const where: any = { businessId: user.businessId }
  if (status) where.status = status

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  })

  return NextResponse.json({ invoices })
}

async function nextInvoiceNumber(tx: any, businessId: string, year: number): Promise<string> {
  const prefix = `BILL-${year}`
  const rows = await tx.invoice.findMany({
    where: { businessId, invoiceNumber: { startsWith: prefix } },
    select: { invoiceNumber: true },
  })

  let max = 0
  for (const row of rows) {
    const n = parseInt(row.invoiceNumber.slice(prefix.length), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
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
    const parsed = invoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    }
    const data = parsed.data
    const rawItems: any[] = data.items
    if (!data.customerId) {
      return NextResponse.json({ error: 'انتخاب مشتری الزامی است' }, { status: 400 })
    }

    const dueDate = new Date(data.dueDate)
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'تاریخ سررسید معتبر نیست' }, { status: 400 })
    }

    // Invoices carry no tax/discount columns, so the payable amount is the
    // exact sum of the lines (tax rate 0, no order discount).
    const totals = computeSaleTotals({
      lines: rawItems.map((item: any) => ({
        unitPrice: item?.unitPrice,
        quantity: item?.quantity,
        discount: item?.discount,
      })),
      orderDiscount: 0,
      taxRate: 0,
    })

    if (totals.errors.length > 0) {
      return NextResponse.json({ error: totals.errors[0], details: totals.errors }, { status: 400 })
    }

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, businessId: user.businessId },
      select: { id: true },
    })
    if (!customer) return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 })

    const productIds = [...new Set(rawItems.map((i: any) => String(i?.productId || '')))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId: user.businessId },
      select: { id: true },
    })
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'یکی از کالاها یافت نشد' }, { status: 404 })
    }

    const saleId = data.saleId || null
    if (saleId) {
      const sale = await prisma.sale.findFirst({
        where: { id: saleId, businessId: user.businessId },
        select: { id: true },
      })
      if (!sale) return NextResponse.json({ error: 'فروش مرتبط یافت نشد' }, { status: 404 })
    }

    const paid = Math.min(roundHalfUp(parseMoney(data.paidAmount) ?? 0), totals.total)

    const year = new Date().getFullYear()
    let invoice: any = null
    let lastError: any = null

    for (let attempt = 0; attempt < 3 && !invoice; attempt++) {
      try {
        invoice = await prisma.$transaction(async (tx) => {
          const invoiceNumber = await nextInvoiceNumber(tx, user.businessId, year)
          return tx.invoice.create({
            data: {
              businessId: user.businessId,
              invoiceNumber,
              saleId,
              customerId: customer.id,
              dueDate,
              totalAmount: totals.total,
              paidAmount: paid,
              // a partially-paid invoice must not read as unpaid
              status: invoiceStatus(paid, totals.total),
              notes: data.notes || null,
              items: {
                create: rawItems.map((item: any, i: number) => ({
                  productId: String(item.productId),
                  description: item.description || null,
                  quantity: parseQuantity(item.quantity) ?? 0,
                  unitPrice: parseMoney(item.unitPrice) ?? 0,
                  total: totals.lineTotals[i],
                })),
              },
            },
            include: { customer: true, items: true },
          })
        })
      } catch (e: any) {
        lastError = e
        if (e?.code !== 'P2002') throw e
      }
    }

    if (!invoice) {
      console.error('Create invoice failed after retries:', lastError)
      return NextResponse.json({ error: 'خطا در ایجاد فاکتور' }, { status: 500 })
    }

    return NextResponse.json({ invoice, totals }, { status: 201 })
  } catch (error) {
    console.error('Create invoice error:', error)
    return NextResponse.json({ error: 'خطا در ایجاد فاکتور' }, { status: 500 })
  }
}

/** Invoice status vocabulary is its own thing; map from the money helper. */
function invoiceStatus(paid: number, total: number): string {
  const s = resolvePaymentStatus(total, paid)
  if (s === 'paid') return 'paid'
  if (s === 'partial') return 'partial'
  return 'unpaid'
}
