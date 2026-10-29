'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center">
      <div className="font-mono text-[10px] tracking-[0.22em] text-ink-600">ERROR 500</div>
      <h1 className="mt-6 text-display-md font-black text-ink-50">یک خطای غیرمنتظره رخ داد</h1>
      <p className="mt-4 max-w-md text-[14px] leading-7 text-ink-500">
        مشکلی در بارگذاری این بخش پیش آمد. می‌توانی دوباره تلاش کنی.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[10px] text-ink-700">digest: {error.digest}</p>
      ) : null}
      <button type="button" onClick={reset} className="btn-ink mt-9">
        تلاش دوباره
      </button>
    </div>
  )
}
