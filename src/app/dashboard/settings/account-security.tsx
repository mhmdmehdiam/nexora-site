'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '../icons'

/**
 * Account security: change password + sign out everywhere.
 *
 * Both actions invalidate the session token, so after either one we send the
 * user to /login instead of leaving them on a page whose next API call 401s.
 */
export function AccountSecurity() {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'تغییر رمز ناموفق بود')
        return
      }
      setNotice('رمز تغییر کرد. در حال انتقال به صفحه‌ی ورود…')
      setTimeout(() => router.push('/login'), 1600)
    } catch {
      setError('خطای شبکه — اتصال را بررسی کن')
    } finally {
      setBusy(false)
    }
  }

  async function signOutEverywhere() {
    setError('')
    setBusy(true)
    try {
      await fetch('/api/auth/logout-all', { method: 'POST' })
      router.push('/login')
    } catch {
      setError('خطای شبکه')
      setBusy(false)
    }
  }

  return (
    <div className='glass-card p-6'>
      <h3 className='text-lg font-semibold text-ink-50 mb-6 flex items-center gap-2'>
        <Icon name='shield' className='w-5 h-5 text-ink-400' /> امنیت حساب
      </h3>

      <form onSubmit={changePassword} className='space-y-4'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <label className='block text-sm text-ink-400 mb-1.5'>رمز فعلی</label>
            <input
              type='password'
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className='input-field'
              dir='ltr'
              autoComplete='current-password'
            />
          </div>
          <div>
            <label className='block text-sm text-ink-400 mb-1.5'>رمز جدید</label>
            <input
              type='password'
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className='input-field'
              dir='ltr'
              autoComplete='new-password'
              placeholder='حداقل ۸ کاراکتر'
            />
          </div>
        </div>

        {error && (
          <p className='border border-red-500/25 bg-red-500/[0.08] px-3 py-2 text-[12.5px] text-red-300'>
            {error}
          </p>
        )}
        {notice && (
          <p className='border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-2 text-[12.5px] text-emerald-300'>
            {notice}
          </p>
        )}

        <div className='flex flex-wrap items-center gap-3'>
          <button type='submit' disabled={busy || !current || !next} className='btn-primary px-6'>
            {busy ? 'در حال ذخیره…' : 'تغییر رمز عبور'}
          </button>

          <button
            type='button'
            onClick={signOutEverywhere}
            disabled={busy}
            className='rounded-xl border border-ink-100/15 px-5 py-2.5 text-[12.5px] text-ink-200 transition-colors hover:border-red-400/40 hover:text-red-300'
          >
            خروج از همه دستگاه‌ها
          </button>
        </div>

        <p className='text-xs text-ink-500'>
          با تغییر رمز یا خروج از همه دستگاه‌ها، همه‌ی نشست‌های فعال بسته می‌شوند و باید دوباره وارد
          شوی.
        </p>
      </form>
    </div>
  )
}
