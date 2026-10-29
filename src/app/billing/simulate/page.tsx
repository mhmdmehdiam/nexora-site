'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

/**
 * Mock-gateway payment simulator — only reachable when no ZARINPAL_MERCHANT_ID
 * is configured. Mimics the bank page: pay OK / cancel, then the real
 * callback route does the bookkeeping.
 */
function SimulateInner() {
  const params = useSearchParams()
  const payment = params.get('payment') || ''
  const authority = params.get('authority') || ''

  return (
    <div className="grain relative flex min-h-screen items-center justify-center bg-ink-950 px-5 text-ink-100">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 bg-sand" aria-hidden="true" />
          <span className="font-serif text-[22px] italic text-ink-50">Nexora</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-600">
            gateway · sandbox
          </span>
        </div>

        <div className="rounded-3xl border border-sand/35 bg-ink-50/[0.03] p-7">
          <div className="mb-5 flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-amber-300">
              حالت آزمایشی — پول واقعی جابه‌جا نمی‌شود
            </span>
          </div>

          <h1 className="text-[19px] font-bold text-ink-50">تأیید پرداخت</h1>
          <p className="mt-2 text-[12px] leading-6 text-ink-500">
            این صفحه نقش درگاه بانکی را بازی می‌کند تا کل جریان ارتقا را قبل از
            داشتن حساب زرین‌پال تست کنی.
          </p>

          <div className="mt-6 space-y-2.5 border-y border-ink-100/[0.08] py-4 font-mono text-[10.5px] text-ink-500">
            <p className="flex justify-between">
              <span>authority</span>
              <span dir="ltr" className="text-ink-300">{authority ? authority.slice(0, 18) + '…' : '—'}</span>
            </p>
            <p className="flex justify-between">
              <span>payment</span>
              <span dir="ltr" className="text-ink-300">{payment ? payment.slice(0, 14) + '…' : '—'}</span>
            </p>
          </div>

          <div className="mt-6 space-y-2.5">
            <a
              href={`/api/billing/callback?Authority=${encodeURIComponent(authority)}&Status=OK`}
              className="btn-ink block w-full py-3 text-center text-[13px]"
            >
              پرداخت موفق (شبیه‌سازی)
            </a>
            <a
              href={`/api/billing/callback?Authority=${encodeURIComponent(authority)}&Status=NOK`}
              className="btn-outline block w-full py-3 text-center text-[13px]"
            >
              انصراف از پرداخت
            </a>
          </div>
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/pricing"
            className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-700 transition-colors hover:text-ink-400"
          >
            ← back to plans
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function BillingSimulatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-500">
          …
        </div>
      }
    >
      <SimulateInner />
    </Suspense>
  )
}
