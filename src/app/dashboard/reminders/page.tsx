'use client'

import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [form, setForm] = useState({
    customerId: '',
    amount: '',
    description: '',
    dueDate: '',
    isRecurring: false,
    recurringInterval: 'monthly',
  })

  const load = async () => {
    const [remRes, custRes] = await Promise.all([fetch('/api/reminders'), fetch('/api/customers')])
    const [r, c] = await Promise.all([remRes.json(), custRes.json()])
    setReminders(r.reminders || [])
    setCustomers(c.customers || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleComplete = async (id: string) => {
    await fetch('/api/reminders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowModal(false)
    setForm({
      customerId: '',
      amount: '',
      description: '',
      dueDate: '',
      isRecurring: false,
      recurringInterval: 'monthly',
    })
    load()
  }

  const isOverdue = (date: string) => new Date(date) < new Date()

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title'>یادآوری پرداخت</h1>
          <p className='page-subtitle'>{reminders.length} یادآوری فعال</p>
        </div>
        <button onClick={() => setShowModal(true)} className='btn-primary flex items-center gap-2'>
          <Icon name='plus' className='w-5 h-5' /> یادآوری جدید
        </button>
      </div>

      {loading ? (
        <div className='space-y-3'>
          {[...Array(3)].map((_, i) => (
            <div key={i} className='skeleton h-20 rounded-2xl' />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className='glass-card p-12 text-center'>
          <Icon name='bell' className='w-12 h-12 text-ink-600 mx-auto mb-3' />
          <p className='text-ink-400'>یادآوری فعالی وجود ندارد</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {reminders.map((r) => (
            <div
              key={r.id}
              className={`glass-card p-5 flex items-center gap-4 ${isOverdue(r.dueDate) ? 'border-red-500/20' : ''}`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOverdue(r.dueDate) ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}
              >
                <Icon name='bell' className='w-6 h-6' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-ink-50 font-medium'>{r.customer.name}</p>
                <p className='text-sm text-ink-400 truncate'>{r.description}</p>
                <div className='flex items-center gap-3 mt-1 text-xs'>
                  <span className='text-ink-500'>سررسید: {formatDate(r.dueDate)}</span>
                  {r.isRecurring && (
                    <span className='badge text-purple-400 bg-purple-400/10 border-purple-400/20'>
                      {r.recurringInterval === 'monthly' ? 'ماهانه' : r.recurringInterval}
                    </span>
                  )}
                </div>
              </div>
              <div className='text-left'>
                <p className='text-lg font-bold text-ink-50'>{formatCurrency(r.amount)}</p>
              </div>
              <button
                onClick={() => handleComplete(r.id)}
                className='btn-ghost text-xs text-emerald-400 hover:text-emerald-300 py-2 px-3'
              >
                انجام شد
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='fixed inset-0 bg-black/60 backdrop-blur-sm'
            onClick={() => setShowModal(false)}
          />
          <div className='glass-card w-full max-w-md p-6 relative animate-scale-in'>
            <h2 className='text-xl font-bold text-ink-50 mb-6'>یادآوری جدید</h2>
            <form onSubmit={handleSubmit} className='space-y-4'>
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
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>مبلغ *</label>
                  <input
                    type='number'
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className='input-field'
                    dir='ltr'
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>تاریخ سررسید *</label>
                  <input
                    type='date'
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className='input-field'
                    dir='ltr'
                    required
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>توضیحات</label>
                <input
                  type='text'
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className='input-field'
                />
              </div>
              <div className='flex items-center gap-3'>
                <input
                  type='checkbox'
                  id='recurring'
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className='w-4 h-4 rounded accent-brand-500'
                />
                <label htmlFor='recurring' className='text-sm text-ink-300'>
                  تکرار دوره‌ای
                </label>
              </div>
              <div className='flex gap-3 pt-2'>
                <button type='submit' className='btn-primary flex-1'>
                  ایجاد
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
