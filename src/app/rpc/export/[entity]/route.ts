import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * CSV export for sales, customers and products.
 *
 * Excel on Windows assumes the system codepage unless the file starts with a
 * UTF-8 BOM — without it every Persian column name turns into mojibake. The
 * BOM is invisible in Excel but essential.
 */

const BOM = '\uFEFF'

/** RFC 4180 quoting, plus the formula-injection guard. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  // A leading =, +, -, @ makes Excel treat the cell as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return BOM + [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\r\n')
}

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}

function stamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

export async function GET(req: NextRequest, ctx: { params: { entity: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // exports are heavy — 10 per hour per user is plenty
  const rl = await rateLimit(`export:${user.id}`, 10, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `خروجی‌های زیاد؛ ${Math.ceil(rl.retryAfterSec / 60)} دقیقه دیگر تلاش کن` },
      { status: 429 }
    )
  }

  const { entity } = ctx.params
  const bid = user.businessId

  if (entity === 'sales') {
    const sales = await prisma.sale.findMany({
      where: { businessId: bid },
      orderBy: { saleDate: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true } } } },
        user: { select: { name: true } },
      },
    })
    const rows = sales.map((s) => [
      s.id,
      s.saleDate.toISOString().slice(0, 10),
      s.customer.name,
      s.customer.phone || '',
      s.items.map((i) => `${i.product.name} ×${i.quantity}`).join(' | '),
      s.totalAmount,
      s.discount,
      s.finalAmount,
      s.paidAmount,
      s.status,
      s.paymentMethod || '',
      s.user?.name || '',
    ])
    return csvResponse(
      toCsv(
        [
          'شناسه',
          'تاریخ',
          'مشتری',
          'تلفن',
          'اقلام',
          'جمع',
          'تخفیف',
          'مبلغ نهایی',
          'پرداخت‌شده',
          'وضعیت',
          'روش پرداخت',
          'ثبت‌کننده',
        ],
        rows
      ),
      `sales-${stamp()}.csv`
    )
  }

  if (entity === 'customers') {
    const customers = await prisma.customer.findMany({
      where: { businessId: bid },
      orderBy: { createdAt: 'desc' },
    })
    const rows = customers.map((c) => [
      c.name,
      c.phone || '',
      c.email || '',
      c.address || '',
      c.city || '',
      c.notes || '',
      c.createdAt.toISOString().slice(0, 10),
    ])
    return csvResponse(
      toCsv(['نام', 'تلفن', 'ایمیل', 'آدرس', 'شهر', 'یادداشت', 'تاریخ ثبت'], rows),
      `customers-${stamp()}.csv`
    )
  }

  if (entity === 'products') {
    const products = await prisma.product.findMany({
      where: { businessId: bid },
      orderBy: { createdAt: 'desc' },
    })
    const rows = products.map((p) => [
      p.name,
      p.sku || '',
      p.category || '',
      p.price,
      p.cost,
      p.stock,
      p.minStock,
      p.unit || '',
      p.isActive ? 'فعال' : 'غیرفعال',
    ])
    return csvResponse(
      toCsv(
        ['نام', 'کد', 'دسته', 'قیمت', 'بهای تمام‌شده', 'موجودی', 'حد هشدار', 'واحد', 'وضعیت'],
        rows
      ),
      `products-${stamp()}.csv`
    )
  }

  return NextResponse.json({ error: 'نوع خروجی نامعتبر است' }, { status: 400 })
}
