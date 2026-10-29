'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  notes: string | null
  createdAt: string
  customer: { name: string; phone: string | null; email: string | null; address: string | null }
  items: { id: string; description: string | null; quantity: number; unitPrice: number; total: number; product: { name: string; unit: string | null } }[]
  sale: { saleDate: string; paymentMethod: string | null } | null
  business: { name: string; phone: string | null; email: string | null; address: string | null; logo: string | null }
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'پرداخت‌شده',
  partial: 'پرداخت جزئی',
  unpaid: 'پرداخت‌نشده',
  overdue: 'سررسید گذشته',
  cancelled: 'لغو‌شده',
}

function fa(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n)
}

function faDate(iso: string) {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tehran',
  })
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/invoices/${params.id}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'خطا در دریافت فاکتور')
        return data.invoice as Invoice
      })
      .then((inv) => alive && setInvoice(inv))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center text-[13px] text-ink-500">
        در حال بارگذاری فاکتور…
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-[13px] text-ink-400">{error || 'فاکتور پیدا نشد'}</p>
        <Link href="/dashboard/invoices" className="btn-primary mt-6 inline-flex">
          بازگشت به فاکتورها
        </Link>
      </div>
    )
  }

  const remaining = invoice.totalAmount - invoice.paidAmount

  return (
    <div className="mx-auto max-w-4xl">
      {/* actions — never printed */}
      <div data-no-print className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/invoices"
          className="text-[12.5px] text-ink-400 transition-colors hover:text-ink-50"
        >
          ← بازگشت به فاکتورها
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-ink-600 sm:block">
            در پنجره‌ی چاپ می‌توانی «ذخیره به‌عنوان PDF» را انتخاب کنی
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary px-5 py-2 text-[12.5px]"
          >
            چاپ / PDF
          </button>
        </div>
      </div>

      {/* the sheet */}
      <article className="invoice-sheet bg-ink-900 p-8 md:p-12 print:bg-white print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink-100/[0.14] pb-7 print:border-black/20">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 bg-sand print:bg-black" aria-hidden="true" />
              <span className="font-serif text-[24px] italic text-ink-50 print:text-black">
                {invoice.business.name}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-[11.5px] leading-6 text-ink-500 print:text-black/70">
              {invoice.business.address && <div>{invoice.business.address}</div>}
              {invoice.business.phone && <div dir="ltr">{invoice.business.phone}</div>}
              {invoice.business.email && <div dir="ltr">{invoice.business.email}</div>}
            </div>
          </div>

          <div className="text-left">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-600 print:text-black/60">
              فاکتور فروش
            </div>
            <div className="mt-1.5 font-mono text-[15px] font-semibold text-ink-50 print:text-black" dir="ltr">
              {invoice.invoiceNumber}
            </div>
            <div className="mt-2 text-[11.5px] text-ink-500 print:text-black/70">
              تاریخ: {faDate(invoice.createdAt)}
            </div>
            <div className="text-[11.5px] text-ink-500 print:text-black/70">
              سررسید: {faDate(invoice.dueDate)}
            </div>
            <div className="mt-2 inline-block border border-ink-100/20 px-2 py-0.5 text-[10.5px] text-ink-300 print:border-black/30 print:text-black">
              {STATUS_LABEL[invoice.status] || invoice.status}
            </div>
          </div>
        </header>

        <section className="mt-7 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-600 print:text-black/60">
              مشتری
            </div>
            <div className="mt-2 text-[13.5px] font-semibold text-ink-50 print:text-black">
              {invoice.customer.name}
            </div>
            <div className="mt-1 space-y-0.5 text-[11.5px] leading-6 text-ink-500 print:text-black/70">
              {invoice.customer.phone && <div dir="ltr">{invoice.customer.phone}</div>}
              {invoice.customer.email && <div dir="ltr">{invoice.customer.email}</div>}
              {invoice.customer.address && <div>{invoice.customer.address}</div>}
            </div>
          </div>
        </section>

        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-y border-ink-100/[0.14] print:border-black/25">
              <th className="py-2.5 text-right font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600 print:text-black/60">
                #
              </th>
              <th className="py-2.5 text-right font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600 print:text-black/60">
                شرح
              </th>
              <th className="py-2.5 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600 print:text-black/60">
                تعداد
              </th>
              <th className="py-2.5 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600 print:text-black/60">
                قیمت واحد
              </th>
              <th className="py-2.5 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600 print:text-black/60">
                جمع
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id} className="border-b border-ink-100/[0.07] print:border-black/10">
                <td className="py-3 text-[12px] text-ink-500 print:text-black/60">{fa(i + 1)}</td>
                <td className="py-3 text-[12.5px] text-ink-100 print:text-black">
                  {item.product.name}
                  {item.description ? (
                    <span className="block text-[11px] text-ink-500 print:text-black/60">
                      {item.description}
                    </span>
                  ) : null}
                </td>
                <td className="py-3 text-left text-[12px] text-ink-300 print:text-black">
                  {fa(item.quantity)} {item.product.unit || ''}
                </td>
                <td className="py-3 text-left text-[12px] text-ink-300 print:text-black">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-3 text-left text-[12px] font-semibold text-ink-100 print:text-black">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-[280px] space-y-2">
            <div className="flex items-center justify-between text-[12.5px]">
              <dt className="text-ink-500 print:text-black/70">جمع کل</dt>
              <dd className="font-semibold text-ink-50 print:text-black">
                {formatCurrency(invoice.totalAmount)}
              </dd>
            </div>
            <div className="flex items-center justify-between text-[12.5px]">
              <dt className="text-ink-500 print:text-black/70">پرداخت‌شده</dt>
              <dd className="text-ink-300 print:text-black">{formatCurrency(invoice.paidAmount)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-ink-100/[0.14] pt-2 text-[13.5px] print:border-black/25">
              <dt className="text-ink-300 print:text-black/80">مانده</dt>
              <dd className="font-bold text-ink-50 print:text-black">{formatCurrency(remaining)}</dd>
            </div>
          </dl>
        </div>

        {invoice.notes && (
          <div className="mt-8 border-t border-ink-100/[0.1] pt-5 print:border-black/20">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-600 print:text-black/60">
              یادداشت
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-7 text-ink-400 print:text-black/80">
              {invoice.notes}
            </p>
          </div>
        )}

        <footer className="mt-10 flex items-center justify-between border-t border-ink-100/[0.1] pt-5 text-[10.5px] text-ink-600 print:border-black/20 print:text-black/60">
          <span>این فاکتور به‌صورت خودکار توسط نکسورا صادر شده است.</span>
          <span dir="ltr" className="font-mono">
            {invoice.invoiceNumber}
          </span>
        </footer>
      </article>
    </div>
  )
}
