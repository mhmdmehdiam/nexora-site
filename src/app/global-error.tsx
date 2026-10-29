'use client'

/**
 * Root-level error boundary.
 *
 * Unlike `error.tsx`, this catches failures in the root layout itself, so
 * it must render its own <html>/<body>. Styles are inlined because the
 * global stylesheet may not have loaded when this renders.
 */

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // best-effort client-side report; the server logger owns the canonical trail
    try {
      fetch('/api/log/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          digest: error.digest,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
          url: typeof window !== 'undefined' ? window.location.href : '',
        }),
      }).catch(() => {})
    } catch {
      /* ignore */
    }
  }, [error])

  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0b0f',
          color: '#f5f2ea',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: '0.22em',
              color: '#6b6b78',
              textTransform: 'uppercase',
            }}
          >
            error 500
          </div>
          <h1 style={{ marginTop: 20, fontSize: 26, fontWeight: 800, lineHeight: 1.4 }}>
            یک خطای غیرمنتظره رخ داد
          </h1>
          <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.9, color: '#9a9aa8' }}>
            مشکلی در بارگذاری صفحه پیش آمد. می‌توانی دوباره تلاش کنی؛ اگر ادامه داشت با پشتیبانی
            تماس بگیر.
          </p>
          {error.digest ? (
            <p style={{ marginTop: 10, fontFamily: 'monospace', fontSize: 10, color: '#5a5a66' }}>
              digest: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              padding: '12px 28px',
              borderRadius: 999,
              border: '1px solid rgba(201,183,156,0.4)',
              background: 'transparent',
              color: '#e8d5b5',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            تلاش دوباره
          </button>
        </div>
      </body>
    </html>
  )
}
