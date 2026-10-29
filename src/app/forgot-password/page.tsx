'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell, Field, Alert } from '@/components/auth/auth-shell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'ارسال لینک ناموفق بود')
        return
      }
      setSent(true)
    } catch {
      setError('خطای شبکه — اتصال را بررسی کن')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      index="RECOVER"
      title="رمز عبورت را فراموش کردی؟"
      subtitle="ایمیل حسابت را وارد کن؛ یک لینک برای تعیین رمز جدید می‌فرستیم."
      footer={
        <>
          یادت آمد؟{' '}
          <Link href="/login" className="text-ink-200 underline underline-offset-4 hover:text-sand">
            بازگشت به ورود
          </Link>
        </>
      }
    >
      {sent ? (
        <>
          <Alert tone="success">
            اگر این ایمیل در سیستم ثبت شده باشد، لینک بازیابی همین حالا ارسال شد. صندوق ورودی و
            پوشه‌ی هرزنامه را چک کن.
          </Alert>
          <p className="text-[12.5px] leading-7 text-ink-500">
            لینک تا <strong className="text-ink-300">۶۰ دقیقه</strong> معتبر است و فقط یک بار
            کار می‌کند.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
            className="mt-6 w-full border border-ink-100/20 py-3 text-[13px] font-semibold text-ink-100 transition-colors hover:border-ink-100/40"
          >
            ارسال دوباره برای ایمیل دیگر
          </button>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          {error && <Alert tone="error">{error}</Alert>}

          <Field label="ایمیل" id="email">
            <input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
            />
          </Field>

          <button type="submit" disabled={loading} className="btn-ink w-full py-3.5">
            {loading ? 'در حال ارسال…' : 'ارسال لینک بازیابی'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
