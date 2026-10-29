'use client'

import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils'
import { ExportButton } from '@/components/dashboard/export-button'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<any>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
  })

  const loadCustomers = async () => {
    const res = await fetch(`/api/customers?search=${search}`)
    const data = await res.json()
    setCustomers(data.customers || [])
    setLoading(false)
  }

  useEffect(() => {
    loadCustomers()
  }, [search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editCustomer ? `/api/customers/${editCustomer.id}` : '/api/customers'

    const method = editCustomer ? 'PUT' : 'POST'

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowModal(false)
    setEditCustomer(null)
    setForm({ name: '', email: '', phone: '', address: '', city: '', notes: '' })
    loadCustomers()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('آیا مطمئن هستید؟')) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    loadCustomers()
  }

  const openEdit = (customer: any) => {
    setEditCustomer(customer)
    setForm({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      notes: customer.notes || '',
    })
    setShowModal(true)
  }

  return (
    <div className='space-y-6'>
      <div className='page-header animate-slide-in-up'>
        <div>
          <h1 className='page-title text-3xl'>مدیریت مشتریان</h1>
          <p className='page-subtitle'>{formatNumber(customers.length)} مشتری فعال</p>
        </div>
        <div className='flex items-center gap-2'>
          <ExportButton entity='customers' />
          <button
          onClick={() => {
            setEditCustomer(null)
            setForm({ name: '', email: '', phone: '', address: '', city: '', notes: '' })
            setShowModal(true)
          }}
          className='btn-primary flex items-center gap-2 ripple'
        >
          <Icon name='plus' className='w-5 h-5' /> مشتری جدید
        </button>
        </div>
      </div>

      {/* Search */}
      <div
        className='glass-card p-4 animate-slide-in-up'
        style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}
      >
        <div className='relative'>
          <Icon
            name='search'
            className='w-5 h-5 text-ink-500 absolute right-3 top-1/2 -translate-y-1/2'
          />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='input-field input-glow pr-10'
            placeholder='جستجوی نام، تلفن، ایمیل...'
          />
        </div>
      </div>

      {/* Customers table */}
      <div className='glass-card overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-ink-100/[0.08]'>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  نام
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  تلفن
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  شهر
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  کل خرید
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  آخرین خرید
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  عملیات
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className='text-center py-12 text-ink-500'>
                    مشتری یافت نشد
                  </td>
                </tr>
              ) : (
                customers.map((c, idx) => (
                  <tr
                    key={c.id}
                    className='table-row mv-in'
                    style={{ ['--i' as string]: idx }}
                  >
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-9 h-9 rounded-xl bg-sand/12 flex items-center justify-center text-sand font-bold text-sm'>
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className='text-sm font-medium text-ink-50'>{c.name}</p>
                          {c.email && <p className='text-xs text-ink-500'>{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 text-sm text-ink-300' dir='ltr'>
                      {c.phone || '—'}
                    </td>
                    <td className='px-6 py-4 text-sm text-ink-300'>{c.city || '—'}</td>
                    <td className='px-6 py-4 text-sm font-medium text-ink-50'>
                      {formatCurrency(c.totalSpent)}
                    </td>
                    <td className='px-6 py-4 text-sm text-ink-400'>
                      {c.lastPurchase ? formatDate(c.lastPurchase) : '—'}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => openEdit(c)}
                          className='btn-ghost text-xs py-1.5 px-3'
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className='btn-ghost text-xs py-1.5 px-3 text-red-400 hover:text-red-300'
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='fixed inset-0 bg-black/60 backdrop-blur-sm'
            onClick={() => setShowModal(false)}
          />
          <div className='glass-card w-full max-w-lg p-6 relative animate-scale-in max-h-[90vh] overflow-y-auto'>
            <h2 className='text-xl font-bold text-ink-50 mb-6'>
              {editCustomer ? 'ویرایش مشتری' : 'مشتری جدید'}
            </h2>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>نام *</label>
                <input
                  type='text'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className='input-field'
                  required
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>تلفن</label>
                  <input
                    type='text'
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className='input-field'
                    dir='ltr'
                  />
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>ایمیل</label>
                  <input
                    type='email'
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className='input-field'
                    dir='ltr'
                  />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>شهر</label>
                  <input
                    type='text'
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className='input-field'
                  />
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>آدرس</label>
                  <input
                    type='text'
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className='input-field'
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>یادداشت</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className='input-field min-h-[80px]'
                />
              </div>
              <div className='flex gap-3 pt-2'>
                <button type='submit' className='btn-primary flex-1'>
                  {editCustomer ? 'بروزرسانی' : 'ایجاد'}
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
