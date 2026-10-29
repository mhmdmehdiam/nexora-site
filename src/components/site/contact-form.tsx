'use client'

import { useState } from 'react'
import { Alert } from '@/components/auth/auth-shell'
import { Magnetic } from '@/components/motion/kit'

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'ارسال پیام ناموفق بود')
        return
      }
      setSent(true)
    } catch {
      setError('خطای شبکه — اتصال را بررسی کن')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    // A drawn check rather than a green box: sending a message is the one
    // moment on this page where a beat of ceremony is warranted.
    return (
      <div className="mv-in flex flex-col items-center py-10 text-center">
        <svg className="mv-check" viewBox="0 0 52 52" width="56" height="56" aria-hidden="true">
          <circle cx="26" cy="26" r="23" fill="none" stroke="rgb(var(--sand))" strokeWidth="1.5" />
          <path
            d="M16 27.5 L23 34.5 L37 19"
            fill="none"
            stroke="rgb(var(--sand))"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="mt-6 text-[15px] font-medium text-ink-50">پیامت رسید.</p>
        <p className="mt-2 max-w-sm text-[12.5px] leading-7 text-ink-400">
          حداکثر یک روز کاری پاسخ می‌دهیم. اگر فوری است، مستقیم به{' '}
          <span dir="ltr" className="text-ink-200">
            support@nexora.ir
          </span>{' '}
          ایمیل بزن.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="mb-2 block text-[11.5px] text-ink-400">
            نام
          </label>
          <input id="c-name" value={form.name} onChange={set('name')} className="input-field" required />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-2 block text-[11.5px] text-ink-400">
            ایمیل
          </label>
          <input
            id="c-email"
            type="email"
            dir="ltr"
            value={form.email}
            onChange={set('email')}
            className="input-field"
            required
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="c-subject" className="mb-2 block text-[11.5px] text-ink-400">
          موضوع
        </label>
        <input id="c-subject" value={form.subject} onChange={set('subject')} className="input-field" required />
      </div>

      <div className="mt-5">
        <label htmlFor="c-message" className="mb-2 block text-[11.5px] text-ink-400">
          پیام
        </label>
        <textarea
          id="c-message"
          rows={6}
          value={form.message}
          onChange={set('message')}
          className="input-field resize-y"
          required
        />
      </div>

      {/* honeypot — hidden from humans, irresistible to bots */}
      <div className="absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
        <label htmlFor="c-website">وب‌سایت</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>

      <Magnetic strength={0.12} className="mt-7">
        <button type="submit" disabled={loading} className="btn-ink w-full py-3.5">
          {loading ? 'در حال ارسال…' : 'ارسال پیام'}
        </button>
      </Magnetic>
    </form>
  )
}
