'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthShell, Field, Alert } from '@/components/auth/auth-shell'

export function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) setError('لینک بازیابی ناقص است. دوباره از صفحه‌ی فراموشی رمز شروع کن.')
  }, [token])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد')
      return
    }
    if (password !== confirm) {
      setError('دو رمز وارد‌شده یکسان نیستند')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'تغییر رمز ناموفق بود')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2200)
    } catch {
      setError('خطای شبکه — اتصال را بررسی کن')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell index="DONE" title="رمز عبورت تغییر کرد" subtitle="همه‌ی نشست‌های قبلی بسته شدند.">
        <Alert tone="success">در حال انتقال به صفحه‌ی ورود…</Alert>
        <Link href="/login" className="btn-ink w-full py-3.5">
          ورود با رمز جدید
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      index="RESET"
      title="تعیین رمز عبور جدید"
      subtitle="یک رمز تازه انتخاب کن. با ذخیره‌شدن، از همه‌ی دستگاه‌های دیگر خارج می‌شوی."
      footer={
        <Link href="/login" className="text-ink-200 underline underline-offset-4 hover:text-sand">
          بازگشت به ورود
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="رمز عبور جدید" id="password" hint="حداقل ۸ کاراکتر، شامل حرف">
          <div className="relative">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pl-11"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'}
              className="absolute left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-ink-600 hover:text-ink-200"
            >
              {show ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.3A9.5 9.5 0 0121 12a9.7 9.7 0 01-2.2 2.9M6.2 6.2A9.6 9.6 0 003 12a9.7 9.7 0 006.6 4.6" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                  <circle cx="12" cy="12" r="2.6" strokeWidth={1.6} />
                </svg>
              )}
            </button>
          </div>
        </Field>

        <Field label="تکرار رمز عبور" id="confirm">
          <input
            id="confirm"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-field"
            dir="ltr"
          />
        </Field>

        <button type="submit" disabled={loading || !token} className="btn-ink w-full py-3.5">
          {loading ? 'در حال ذخیره…' : 'ذخیره‌ی رمز جدید'}
        </button>
      </form>
    </AuthShell>
  )
}
