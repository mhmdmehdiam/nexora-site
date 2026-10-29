'use client'

import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { formatDate } from '@/lib/utils'

export default function SmsPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ customerId: '', phone: '', message: '' })

  const load = async () => {
    const [smsRes, custRes] = await Promise.all([fetch('/api/sms'), fetch('/api/customers')])
    const [s, c] = await Promise.all([smsRes.json(), custRes.json()])
    setMessages(s.messages || [])
    setCustomers(c.customers || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowModal(false)
    setForm({ customerId: '', phone: '', message: '' })
    load()
  }

  const selectCustomer = (id: string) => {
    const c = customers.find((c: any) => c.id === id)
    setForm({ ...form, customerId: id, phone: c?.phone || '' })
  }

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title'>پیامک</h1>
          <p className='page-subtitle'>ارسال و پیگیری پیامک‌ها</p>
        </div>
        <button onClick={() => setShowModal(true)} className='btn-primary flex items-center gap-2'>
          <Icon name='plus' className='w-5 h-5' /> ارسال پیامک
        </button>
      </div>

      {/* Messages list */}
      {loading ? (
        <div className='space-y-3'>
          {[...Array(5)].map((_, i) => (
            <div key={i} className='skeleton h-16 rounded-xl' />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className='glass-card p-12 text-center'>
          <Icon name='message-square' className='w-12 h-12 text-ink-600 mx-auto mb-3' />
          <p className='text-ink-400'>پیامکی ارسال نشده</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {messages.map((m) => (
            <div key={m.id} className='glass-card p-4 flex items-start gap-4'>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.status === 'sent' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}
              >
                <Icon name='message-square' className='w-5 h-5' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-1'>
                  <span className='text-ink-50 font-medium text-sm'>{m.customer.name}</span>
                  <span className='text-ink-500 text-xs' dir='ltr'>
                    {m.phone}
                  </span>
                </div>
                <p className='text-sm text-ink-300'>{m.message}</p>
                <p className='text-xs text-ink-500 mt-1'>
                  {m.sentAt ? formatDate(m.sentAt) : 'در انتظار'}
                </p>
              </div>
              <span
                className={`badge text-[10px] ${m.status === 'sent' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}
              >
                {m.status === 'sent' ? 'ارسال شده' : 'ناموفق'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Send SMS Modal */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='fixed inset-0 bg-black/60 backdrop-blur-sm'
            onClick={() => setShowModal(false)}
          />
          <div className='glass-card w-full max-w-md p-6 relative animate-scale-in'>
            <h2 className='text-xl font-bold text-ink-50 mb-6'>ارسال پیامک</h2>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>مشتری *</label>
                <select
                  value={form.customerId}
                  onChange={(e) => selectCustomer(e.target.value)}
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
                <label className='block text-sm text-ink-400 mb-1.5'>شماره تلفن</label>
                <input
                  type='text'
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className='input-field'
                  dir='ltr'
                  required
                />
              </div>
              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>متن پیام *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className='input-field min-h-[100px]'
                  required
                />
              </div>
              <p className='text-xs text-ink-500'> در حالت آزمایشی، پیامک واقعی ارسال نمی‌شود</p>
              <div className='flex gap-3 pt-2'>
                <button type='submit' className='btn-primary flex-1'>
                  ارسال
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
