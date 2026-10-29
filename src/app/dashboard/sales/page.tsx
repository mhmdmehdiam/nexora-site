'use client'

import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import {
  formatCurrency,
  formatNumber,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from '@/lib/utils'
import { computeSaleTotals, formatMoney, parseMoney, resolvePaidAmount } from '@/lib/money'
import { ExportButton } from '@/components/dashboard/export-button'

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>(
    [],
  )
  const [form, setForm] = useState({
    customerId: '',
    discount: 0,
    paymentMethod: 'cash',
    paidAmount: 0,
    notes: '',
  })
  const [taxRate, setTaxRate] = useState(10)
  const [formError, setFormError] = useState('')

  const load = async () => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)
    const [salesRes, custRes, prodRes] = await Promise.all([
      fetch(`/api/sales?${params}`),
      fetch('/api/customers'),
      fetch('/api/products'),
    ])
    const [s, c, p] = await Promise.all([salesRes.json(), custRes.json(), prodRes.json()])
    setSales(s.sales || [])
    setCustomers(c.customers || [])
    setProducts(p.products || [])
    if (typeof s.taxRate === 'number') setTaxRate(s.taxRate)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [statusFilter, search])

  const addItem = () => setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[i] = { ...newItems[i], [field]: value }
    if (field === 'productId') {
      const product = products.find((p: any) => p.id === value)
      if (product) newItems[i].unitPrice = product.price
    }
    setItems(newItems)
  }

  // Same function the server uses — the preview can never disagree with what
  // gets stored.
  const totals = computeSaleTotals({
    lines: items.map((it) => ({
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      discount: 0,
    })),
    orderDiscount: form.discount,
    taxRate,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (totals.errors.length > 0) {
      setFormError(totals.errors[0])
      return
    }
    if (!form.customerId) {
      setFormError('انتخاب مشتری الزامی است')
      return
    }

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        discount: totals.orderDiscount,
        paidAmount: resolvePaidAmount(totals.total, form.paidAmount),
        items,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || 'خطا در ثبت فروش')
      return
    }

    setShowModal(false)
    setItems([])
    setForm({ customerId: '', discount: 0, paymentMethod: 'cash', paidAmount: 0, notes: '' })
    load()
  }

  return (
    <div className='space-y-6'>
      <div className='page-header animate-slide-in-up'>
        <div>
          <h1 className='page-title text-3xl'>مدیریت فروش</h1>
          <p className='page-subtitle'>ثبت و پیگیری فروش‌ها</p>
        </div>
        <div className='flex items-center gap-2'>
          <ExportButton entity='sales' />
          <button
            onClick={() => setShowModal(true)}
            className='btn-primary flex items-center gap-2 ripple'
          >
            <Icon name='plus' className='w-5 h-5' /> فروش جدید
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className='glass-card p-4 flex flex-col sm:flex-row gap-3 animate-slide-in-up'
        style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}
      >
        <div className='relative flex-1'>
          <Icon
            name='search'
            className='w-5 h-5 text-ink-500 absolute right-3 top-1/2 -translate-y-1/2'
          />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='input-field input-glow pr-10'
            placeholder='جستجو...'
          />
        </div>
        <div className='flex gap-2'>
          {['', 'paid', 'pending', 'partial'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${statusFilter === s ? 'bg-brand-600 text-ink-50' : 'bg-ink-50/[0.04] text-ink-400 hover:text-ink-50'}`}
            >
              {s === '' ? 'همه' : getStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Sales list */}
      <div className='glass-card overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-ink-100/[0.08]'>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  شماره
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  مشتری
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  تاریخ
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  مبلغ
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  پرداختی
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  وضعیت
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className='table-row'>
                    <td colSpan={6} className='px-6 py-4'>
                      <div className='skeleton h-5 w-full' />
                    </td>
                  </tr>
                ))
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className='text-center py-12 text-ink-500'>
                    فروشی یافت نشد
                  </td>
                </tr>
              ) : (
                sales.map((s, idx) => (
                  <tr
                    key={s.id}
                    className='table-row mv-in'
                    style={{ ['--i' as string]: idx }}
                  >
                    <td className='px-6 py-4 text-sm text-sand font-mono'>{s.invoiceNumber}</td>
                    <td className='px-6 py-4'>
                      <p className='text-sm font-medium text-ink-50'>{s.customer.name}</p>
                    </td>
                    <td className='px-6 py-4 text-sm text-ink-400'>{formatDate(s.saleDate)}</td>
                    <td className='px-6 py-4 text-sm font-medium text-ink-50'>
                      {formatCurrency(s.finalAmount)}
                    </td>
                    <td className='px-6 py-4 text-sm text-ink-300'>
                      {formatCurrency(s.paidAmount)}
                    </td>
                    <td className='px-6 py-4'>
                      <span className={`badge ${getStatusColor(s.status)}`}>
                        {getStatusLabel(s.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='fixed inset-0 bg-black/60 backdrop-blur-sm'
            onClick={() => setShowModal(false)}
          />
          <div className='glass-card w-full max-w-2xl p-6 relative animate-scale-in max-h-[90vh] overflow-y-auto'>
            <h2 className='text-xl font-bold text-ink-50 mb-6'>ثبت فروش جدید</h2>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>مشتری *</label>
                  <select
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className='input-field'
                    required
                  >
                    <option value=''>انتخاب مشتری</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>روش پرداخت</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className='input-field'
                  >
                    <option value='cash'>نقدی</option>
                    <option value='card'>کارت</option>
                    <option value='transfer'>حواله</option>
                    <option value='credit'>اعتباری</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className='flex items-center justify-between mb-3'>
                  <label className='text-sm text-ink-400'>اقلام فاکتور</label>
                  <button
                    type='button'
                    onClick={addItem}
                    className='btn-ghost text-xs py-1.5 px-3 text-sand'
                  >
                    + افزودن قلم
                  </button>
                </div>
                <div className='space-y-3'>
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className='flex gap-3 items-end p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]'
                    >
                      <div className='flex-1'>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(i, 'productId', e.target.value)}
                          className='input-field text-sm py-2'
                        >
                          <option value=''>محصول</option>
                          {products.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatCurrency(p.price)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className='w-20'>
                        <input
                          type='number'
                          min='1'
                          step='1'
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(i, 'quantity', Math.max(1, parseMoney(e.target.value) ?? 1))
                          }
                          className='input-field text-sm py-2 text-center'
                        />
                      </div>
                      <div className='w-32 text-sm text-ink-300 text-center'>
                        {formatMoney(totals.lineTotals[i] ?? 0)}
                      </div>
                      <button
                        type='button'
                        onClick={() => removeItem(i)}
                        className='text-red-400 hover:text-red-300 p-2'
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className='bg-white/[0.02] rounded-xl p-4 space-y-2 text-sm'>
                <div className='flex justify-between text-ink-400'>
                  <span>جمع کل</span>
                  <span className='tabular-nums'>{formatMoney(totals.subtotal)}</span>
                </div>
                <div className='flex justify-between items-center text-ink-400'>
                  <span>تخفیف</span>
                  <input
                    type='number'
                    min='0'
                    step='1'
                    value={form.discount}
                    onChange={(e) =>
                      setForm({ ...form, discount: Math.max(0, parseMoney(e.target.value) ?? 0) })
                    }
                    className='w-32 input-field text-sm py-1 text-center'
                    dir='ltr'
                  />
                </div>
                <div className='flex justify-between text-ink-400'>
                  <span>مالیات ({formatNumber(totals.taxRate)}٪)</span>
                  <span className='tabular-nums'>{formatMoney(totals.tax)}</span>
                </div>
                <div className='flex justify-between text-ink-50 font-bold text-base pt-2 border-t border-ink-100/[0.08]'>
                  <span>مبلغ نهایی</span>
                  <span className='tabular-nums'>{formatMoney(totals.total)}</span>
                </div>
              </div>

              {formError ? (
                <div className='rounded-xl border border-red-500/25 bg-red-500/[0.08] px-3 py-2 text-[12.5px] text-red-300'>
                  {formError}
                </div>
              ) : null}

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>مبلغ پرداختی</label>
                  <input
                    type='number'
                    min='0'
                    max={totals.total}
                    step='1'
                    value={form.paidAmount}
                    onChange={(e) =>
                      setForm({ ...form, paidAmount: Math.max(0, parseMoney(e.target.value) ?? 0) })
                    }
                    className='input-field'
                    dir='ltr'
                  />
                  {form.paidAmount > totals.total ? (
                    <p className='mt-1 text-[11px] text-amber-300'>
                      مبلغ پرداختی بیش از مبلغ فاکتور است؛ تا سقف فاکتور ثبت می‌شود.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>یادداشت</label>
                  <input
                    type='text'
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className='input-field'
                  />
                </div>
              </div>

              <div className='flex gap-3 pt-2'>
                <button type='submit' className='btn-primary flex-1' disabled={items.length === 0}>
                  ثبت فروش
                </button>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='btn-secondary flex-1'
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
