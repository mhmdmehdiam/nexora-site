import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetForm } from './reset-form'

export const metadata: Metadata = {
  title: 'تعیین رمز عبور جدید',
  robots: { index: false, follow: false },
}

/**
 * useSearchParams() must sit inside a Suspense boundary, otherwise Next tries
 * to prerender the page without a query string and bails out at build time.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-ink-950">
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink-500">LOADING…</span>
        </main>
      }
    >
      <ResetForm />
    </Suspense>
  )
}
