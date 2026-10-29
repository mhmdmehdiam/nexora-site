'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Checkout trigger. Not logged in → register (plan remembered in the URL);
 * logged in → start the gateway redirect.
 */
export default function CheckoutButton({
  plan,
  label,
  className = '',
}: {
  plan: string
  label: string
  className?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const go = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (res.status === 401) {
        router.push(`/register?plan=${plan}`)
        return
      }
      if (!res.ok || !data.redirectUrl) {
        setError(data.error || 'خطا در شروع پرداخت')
        return
      }
      window.location.href = data.redirectUrl
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={go} disabled={loading} className={className}>
        {loading ? 'در حال انتقال به درگاه…' : label}
      </button>
      {error && (
        <p className="mt-2 text-center text-[11.5px] text-red-300" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}
