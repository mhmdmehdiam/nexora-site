'use client'

import { useEffect, useState } from 'react'

function GoogleG() {
  return (
    <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.14-3.1-.4-4.6H24v8.7h11.8c-.5 2.8-2.06 5.1-4.4 6.7v5.6h7.1c4.2-3.9 6.6-9.6 6.6-16.4z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.2v5.8C7.9 41 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.6 27.9c-.44-1.3-.7-2.7-.7-4.1s.25-2.8.7-4.1V14H4.2C2.7 17 1.9 20.4 1.9 23.8s.8 6.8 2.3 9.9l7.4-5.8z"
      />
      <path
        fill="#EA4335"
        d="M24 10.6c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 1.9 24 1.9 15.4 1.9 7.9 6.9 4.2 14l7.4 5.8c1.7-5.3 6.6-9.2 12.4-9.2z"
      />
    </svg>
  )
}

/**
 * "Sign in with Google" — renders only when OAuth credentials are configured
 * (server reports via /api/auth/google/status). The real flow is a full-page
 * redirect, so this is just a styled <a>.
 */
export default function GoogleButton({ label = 'ورود با گوگل' }: { label?: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/google/status')
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d?.enabled)))
      .catch(() => setEnabled(false))
  }, [])

  if (enabled === false) return null

  return (
    <a
      href="/api/auth/google"
      aria-hidden={enabled === null}
      tabIndex={enabled === null ? -1 : 0}
      className={`flex w-full items-center justify-center gap-2.5 border border-ink-100/[0.12] bg-ink-50/[0.03] py-3 text-[13px] text-ink-100 transition-colors hover:border-ink-100/[0.2] hover:bg-ink-50/[0.06] ${
        enabled === null ? 'pointer-events-none opacity-0' : ''
      }`}
    >
      <GoogleG />
      {label}
    </a>
  )
}
